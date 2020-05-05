// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';
import nock from 'nock';
import {Server, WebSocket as MockWebSocket} from 'mock-socket';
import {batchActions} from 'redux-batched-actions';
import thunk from 'redux-thunk';
import configureMockStore from 'redux-mock-store';

import {ChannelTypes, GeneralTypes, RoleTypes, TeamTypes, UserTypes} from '@mm-redux/action_types';
import * as ChannelActions from '@mm-redux/actions/channels';
import * as PostActions from '@mm-redux/actions/posts';
import * as TeamActions from '@mm-redux/actions/teams';
import {Client4} from '@mm-redux/client';
import {General, Posts, RequestStatus} from '@mm-redux/constants';
import * as PostSelectors from '@mm-redux/selectors/entities/posts';
import EventEmitter from '@mm-redux/utils/event_emitter';

import * as Actions from '@actions/websocket';
import {WebsocketEvents} from '@constants';
import initial_state from '@store/initial_state';

import TestHelper from 'test/test_helper';
import configureStore from 'test/test_store';

global.WebSocket = MockWebSocket;

const mockConfigRequest = (config = {}) => {
    nock(Client4.getBaseRoute()).
        get('/config/client?format=old').
        reply(200, config);
};

const mockChanelsRequest = (teamId, channels = []) => {
    nock(Client4.getUserRoute('me')).
        get(`/teams/${teamId}/channels?include_deleted=true`).
        reply(200, channels);
};

const mockRolesRequest = (rolesToLoad = []) => {
    nock(Client4.getRolesRoute()).
        post('/names', JSON.stringify(rolesToLoad)).
        reply(200, rolesToLoad);
};

const mockTeamMemberRequest = (tm = []) => {
    nock(Client4.getUserRoute('me')).
        log(console.log).
        get('/teams/members').
        reply(200, tm);
};

describe('Actions.Websocket', () => {
    let store;
    let mockServer;
    beforeAll(async () => {
        store = await configureStore();
        await TestHelper.initBasic(Client4);

        const connUrl = (Client4.getUrl() + '/api/v4/websocket').replace(/^http:/, 'ws:');
        mockServer = new Server(connUrl);
        return store.dispatch(Actions.init({websocketUrl: Client4.getUrl().replace(/^http:/, 'ws:')}));
    });

    afterAll(async () => {
        Actions.close()();
        mockServer.stop();
        await TestHelper.tearDown();
    });

    it('WebSocket Connect', () => {
        const ws = store.getState().requests.general.websocket;
        assert.ok(ws.status === RequestStatus.SUCCESS);
    });

    it('Websocket Handle New Post if post does not exist', async () => {
        PostSelectors.getPost = jest.fn();
        const channelId = TestHelper.basicChannel.id;
        const message = JSON.stringify({event: WebsocketEvents.POSTED, data: {channel_display_name: TestHelper.basicChannel.display_name, channel_name: TestHelper.basicChannel.name, channel_type: 'O', post: `{"id": "71k8gz5ompbpfkrzaxzodffj8w", "create_at": 1508245311774, "update_at": 1508245311774, "edit_at": 0, "delete_at": 0, "is_pinned": false, "user_id": "${TestHelper.basicUser.id}", "channel_id": "${channelId}", "root_id": "", "parent_id": "", "original_id": "", "message": "Unit Test", "type": "", "props": {}, "hashtags": "", "pending_post_id": "t36kso9nwtdhbm8dbkd6g4eeby: 1508245311749"}`, sender_name: TestHelper.basicUser.username, team_id: TestHelper.basicTeam.id}, broadcast: {omit_users: null, user_id: '', channel_id: channelId, team_id: ''}, seq: 2});

        nock(Client4.getBaseRoute()).
            post('/users/ids').
            reply(200, [TestHelper.basicUser.id]);

        nock(Client4.getBaseRoute()).
            post('/users/status/ids').
            reply(200, [{user_id: TestHelper.basicUser.id, status: 'online', manual: false, last_activity_at: 1507662212199}]);

        // Mock that post already exists and check it is not added
        PostSelectors.getPost.mockReturnValueOnce(true);
        mockServer.emit('message', message);
        let entities = store.getState().entities;
        let posts = entities.posts.posts;
        assert.deepEqual(posts, {});

        // Mock that post does not exist and check it is added
        PostSelectors.getPost.mockReturnValueOnce(false);
        mockServer.emit('message', message);
        await TestHelper.wait(100);
        entities = store.getState().entities;
        posts = entities.posts.posts;
        const postId = Object.keys(posts)[0];
        assert.ok(posts[postId].message.indexOf('Unit Test') > -1);
        entities = store.getState().entities;
    });

    it('Websocket Handle New Post emits INCREASE_POST_VISIBILITY_BY_ONE for current channel when post does not exist', async () => {
        PostSelectors.getPost = jest.fn();
        const emit = jest.spyOn(EventEmitter, 'emit');
        const currentChannelId = TestHelper.generateId();
        const otherChannelId = TestHelper.generateId();
        const messageFor = (channelId) => ({event: WebsocketEvents.POSTED, data: {channel_display_name: TestHelper.basicChannel.display_name, channel_name: TestHelper.basicChannel.name, channel_type: 'O', post: `{"id": "71k8gz5ompbpfkrzaxzodffj8w", "create_at": 1508245311774, "update_at": 1508245311774, "edit_at": 0, "delete_at": 0, "is_pinned": false, "user_id": "${TestHelper.basicUser.id}", "channel_id": "${channelId}", "root_id": "", "parent_id": "", "original_id": "", "message": "Unit Test", "type": "", "props": {}, "hashtags": "", "pending_post_id": "t36kso9nwtdhbm8dbkd6g4eeby: 1508245311749"}`, sender_name: TestHelper.basicUser.username, team_id: TestHelper.basicTeam.id}, broadcast: {omit_users: null, user_id: '', channel_id: channelId, team_id: ''}, seq: 2});

        await store.dispatch(ChannelActions.selectChannel(currentChannelId));
        await TestHelper.wait(100);

        // Post does not exist and is not for current channel
        PostSelectors.getPost.mockReturnValueOnce(false);
        mockServer.emit('message', JSON.stringify(messageFor(otherChannelId)));
        expect(emit).not.toHaveBeenCalled();

        // Post exists and is not for current channel
        PostSelectors.getPost.mockReturnValueOnce(true);
        mockServer.emit('message', JSON.stringify(messageFor(otherChannelId)));
        expect(emit).not.toHaveBeenCalled();

        // Post exists and is for current channel
        PostSelectors.getPost.mockReturnValueOnce(true);
        mockServer.emit('message', JSON.stringify(messageFor(currentChannelId)));
        expect(emit).not.toHaveBeenCalled();

        // Post does not exist and is for current channel
        PostSelectors.getPost.mockReturnValueOnce(false);
        mockServer.emit('message', JSON.stringify(messageFor(currentChannelId)));
        expect(emit).toHaveBeenCalledWith(WebsocketEvents.INCREASE_POST_VISIBILITY_BY_ONE);
    });

    it('Websocket Handle New Post if status is manually set do not set to online', async () => {
        const userId = TestHelper.generateId();

        store = await configureStore({
            entities: {
                users: {
                    statuses: {
                        [userId]: General.DND,
                    },
                    isManualStatus: {
                        [userId]: true,
                    },
                },
            },
        });
        await store.dispatch(Actions.init({websocketUrl: Client4.getUrl().replace(/^http:/, 'ws:')}));

        const channelId = TestHelper.basicChannel.id;
        const message = JSON.stringify({
            event: WebsocketEvents.POSTED,
            data: {
                channel_display_name: TestHelper.basicChannel.display_name,
                channel_name: TestHelper.basicChannel.name,
                channel_type: 'O',
                post: `{"id": "71k8gz5ompbpfkrzaxzodffj8w", "create_at": 1508245311774, "update_at": 1508245311774, "edit_at": 0, "delete_at": 0, "is_pinned": false, "user_id": "${userId}", "channel_id": "${channelId}", "root_id": "", "parent_id": "", "original_id": "", "message": "Unit Test", "type": "", "props": {}, "hashtags": "", "pending_post_id": "t36kso9nwtdhbm8dbkd6g4eeby: 1508245311749"}`,
                sender_name: TestHelper.basicUser.username,
                team_id: TestHelper.basicTeam.id,
            },
            broadcast: {
                omit_users: null,
                user_id: userId,
                channel_id: channelId,
                team_id: '',
            },
            seq: 2,
        });

        mockServer.emit('message', message);
        const entities = store.getState().entities;
        const statuses = entities.users.statuses;
        assert.equal(statuses[userId], General.DND);
    });

    it('Websocket Handle Post Edited', async () => {
        const post = {id: '71k8gz5ompbpfkrzaxzodffj8w'};
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.POST_EDITED, data: {post: `{"id": "71k8gz5ompbpfkrzaxzodffj8w","create_at": 1508245311774,"update_at": 1585236976007,"edit_at": 1585236976007,"delete_at": 0,"is_pinned": false,"user_id": "${TestHelper.basicUser.id}","channel_id": "${TestHelper.basicChannel.id}","root_id": "","parent_id": "","original_id": "","message": "Unit Test (edited)","type": "","props": {},"hashtags": "","pending_post_id": ""}`}, broadcast: {omit_users: null, user_id: '', channel_id: '18k9ffsuci8xxm7ak68zfdyrce', team_id: ''}, seq: 2}));

        await TestHelper.wait(300);

        const {posts} = store.getState().entities.posts;
        assert.ok(posts);
        assert.ok(posts[post.id]);
        assert.ok(posts[post.id].message.indexOf('(edited)') > -1);
    });

    it('Websocket Handle Post Deleted', async () => {
        const post = TestHelper.fakePost();
        post.channel_id = TestHelper.basicChannel.id;

        post.id = '71k8gz5ompbpfkrzaxzodffj8w';
        store.dispatch(PostActions.receivedPost(post));
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.POST_DELETED, data: {post: `{"id": "71k8gz5ompbpfkrzaxzodffj8w","create_at": 1508245311774,"update_at": 1508247709215,"edit_at": 1508247709215,"delete_at": 0,"is_pinned": false,"user_id": "${TestHelper.basicUser.id}","channel_id": "${post.channel_id}","root_id": "","parent_id": "","original_id": "","message": "Unit Test","type": "","props": {},"hashtags": "","pending_post_id": ""}`}, broadcast: {omit_users: null, user_id: '', channel_id: '18k9ffsuci8xxm7ak68zfdyrce', team_id: ''}, seq: 7}));

        const entities = store.getState().entities;
        const {posts} = entities.posts;
        assert.strictEqual(posts[post.id].state, Posts.POST_DELETED);
    });

    it('Websocket handle Post Unread', async () => {
        const teamId = TestHelper.generateId();
        const channelId = TestHelper.generateId();
        const userId = TestHelper.generateId();

        store = await configureStore({
            entities: {
                channels: {
                    channels: {
                        [channelId]: {id: channelId},
                    },
                    myMembers: {
                        [channelId]: {msg_count: 10, mention_count: 0, last_viewed_at: 0},
                    },
                },
                teams: {
                    myMembers: {
                        [teamId]: {msg_count: 10, mention_count: 0},
                    },
                },
            },
        });
        await store.dispatch(Actions.init({websocketUrl: Client4.getUrl().replace(/^http:/, 'ws:')}));

        mockServer.emit('message', JSON.stringify({
            event: WebsocketEvents.POST_UNREAD,
            data: {
                last_viewed_at: 25,
                msg_count: 3,
                mention_count: 2,
                delta_msg: 7,
            },
            broadcast: {omit_users: null, user_id: userId, channel_id: channelId, team_id: teamId},
            seq: 7,
        }));

        const state = store.getState();
        assert.equal(state.entities.channels.manuallyUnread[channelId], true);
        assert.equal(state.entities.channels.myMembers[channelId].msg_count, 3);
        assert.equal(state.entities.channels.myMembers[channelId].mention_count, 2);
        assert.equal(state.entities.channels.myMembers[channelId].last_viewed_at, 25);
        assert.equal(state.entities.teams.myMembers[teamId].msg_count, 3);
        assert.equal(state.entities.teams.myMembers[teamId].mention_count, 2);
    });

    it('Websocket handle Post Unread When marked on the same client', async () => {
        const teamId = TestHelper.generateId();
        const channelId = TestHelper.generateId();
        const userId = TestHelper.generateId();

        store = await configureStore({
            entities: {
                channels: {
                    channels: {
                        [channelId]: {id: channelId},
                    },
                    myMembers: {
                        [channelId]: {msg_count: 5, mention_count: 4, last_viewed_at: 14},
                    },
                    manuallyUnread: {
                        [channelId]: true,
                    },
                },
                teams: {
                    myMembers: {
                        [teamId]: {msg_count: 5, mention_count: 4},
                    },
                },
            },
        });
        await store.dispatch(Actions.init({websocketUrl: Client4.getUrl().replace(/^http:/, 'ws:')}));

        mockServer.emit('message', JSON.stringify({
            event: WebsocketEvents.POST_UNREAD,
            data: {
                last_viewed_at: 25,
                msg_count: 5,
                mention_count: 4,
                delta_msg: 1,
            },
            broadcast: {omit_users: null, user_id: userId, channel_id: channelId, team_id: teamId},
            seq: 17,
        }));

        const state = store.getState();
        assert.equal(state.entities.channels.manuallyUnread[channelId], true);
        assert.equal(state.entities.channels.myMembers[channelId].msg_count, 5);
        assert.equal(state.entities.channels.myMembers[channelId].mention_count, 4);
        assert.equal(state.entities.channels.myMembers[channelId].last_viewed_at, 14);
        assert.equal(state.entities.teams.myMembers[teamId].msg_count, 5);
        assert.equal(state.entities.teams.myMembers[teamId].mention_count, 4);
    });

    it('Websocket Handle Reaction Added to Post', async () => {
        const emoji = '+1';
        const post = {id: 'w7yo9377zbfi9mgiq5gbfpn3ha'};
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.REACTION_ADDED, data: {reaction: `{"user_id":"${TestHelper.basicUser.id}","post_id":"w7yo9377zbfi9mgiq5gbfpn3ha","emoji_name":"${emoji}","create_at":1508249125852}`}, broadcast: {omit_users: null, user_id: '', channel_id: TestHelper.basicChannel.id, team_id: ''}, seq: 12}));

        await TestHelper.wait(300);
        const nextEntities = store.getState().entities;
        const {reactions} = nextEntities.posts;
        const reactionsForPost = reactions[post.id];

        assert.ok(reactionsForPost.hasOwnProperty(`${TestHelper.basicUser.id}-${emoji}`));
    });

    // If we move this test lower it will fail cause of a permissions issue
    it('Websocket handle team updated', async () => {
        const team = {id: '55pfercbm7bsmd11p5cjpgsbwr'};
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.UPDATE_TEAM, data: {team: `{"id":"55pfercbm7bsmd11p5cjpgsbwr","create_at":1495553950859,"update_at":1508250370054,"delete_at":0,"display_name":"${TestHelper.basicTeam.display_name}","name":"${TestHelper.basicTeam.name}","description":"description","email":"","type":"O","company_name":"","allowed_domains":"","invite_id":"m93f54fu5bfntewp8ctwonw19w","allow_open_invite":true}`}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: ''}, seq: 26}));

        await TestHelper.wait(300);

        const entities = store.getState().entities;
        const {teams} = entities.teams;
        const updated = teams[team.id];
        assert.ok(updated);
        assert.strictEqual(updated.allow_open_invite, true);
    });

    it('Websocket handle team patched', async () => {
        const team = {id: '55pfercbm7bsmd11p5cjpgsbwr'};
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.UPDATE_TEAM, data: {team: `{"id":"55pfercbm7bsmd11p5cjpgsbwr","create_at":1495553950859,"update_at":1508250370054,"delete_at":0,"display_name":"${TestHelper.basicTeam.display_name}","name":"${TestHelper.basicTeam.name}","description":"description","email":"","type":"O","company_name":"","allowed_domains":"","invite_id":"m93f54fu5bfntewp8ctwonw19w","allow_open_invite":true}`}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: ''}, seq: 26}));

        await TestHelper.wait(300);

        const entities = store.getState().entities;
        const {teams} = entities.teams;
        const updated = teams[team.id];
        assert.ok(updated);
        assert.strictEqual(updated.allow_open_invite, true);
    });

    it('WebSocket Leave Team', async () => {
        const team = TestHelper.basicTeam;
        store.dispatch(batchActions([
            {type: UserTypes.RECEIVED_ME, data: TestHelper.basicUser},
            {type: TeamTypes.RECEIVED_TEAM, data: TestHelper.basicTeam},
            {type: TeamTypes.RECEIVED_MY_TEAM_MEMBER, data: TestHelper.basicTeamMember},
        ]));
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.LEAVE_TEAM, data: {team_id: team.id, user_id: TestHelper.basicUser.id}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: team.id}, seq: 35}));

        const {myMembers} = store.getState().entities.teams;
        assert.ifError(myMembers[team.id]);
    });

    it('Websocket Handle User Added', async () => {
        const user = {...TestHelper.fakeUser(), id: TestHelper.generateId()};
        store.dispatch({type: UserTypes.RECEIVED_PROFILE_IN_CHANNEL, data: {id: TestHelper.basicChannel.id, user_id: user.id}});
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.USER_ADDED, data: {team_id: TestHelper.basicTeam.id, user_id: user.id}, broadcast: {omit_users: null, user_id: '', channel_id: TestHelper.basicChannel.id, team_id: ''}, seq: 42}));

        const entities = store.getState().entities;
        const profilesInChannel = entities.users.profilesInChannel;
        assert.ok(profilesInChannel[TestHelper.basicChannel.id].has(user.id));
    });

    it('Websocket Handle User Removed', async () => {
        const user = {...TestHelper.fakeUser(), id: TestHelper.generateId()};
        store.dispatch({type: UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL, data: {id: TestHelper.basicChannel.id, user_id: user.id}});
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.USER_REMOVED, data: {remover_id: TestHelper.basicUser.id, user_id: user.id}, broadcast: {omit_users: null, user_id: '', channel_id: TestHelper.basicChannel.id, team_id: ''}, seq: 42}));

        const state = store.getState();
        const entities = state.entities;
        const profilesNotInChannel = entities.users.profilesNotInChannel;

        assert.ok(profilesNotInChannel[TestHelper.basicChannel.id].has(user.id));
    });

    it('Websocket Handle User Removed when Current is Guest', async () => {
        const basicGuestUser = TestHelper.fakeUserWithId();
        basicGuestUser.roles = 'system_guest';

        const user = {...TestHelper.fakeUser(), id: TestHelper.generateId()};

        // add user first
        store.dispatch({type: UserTypes.RECEIVED_PROFILE_IN_CHANNEL, data: {id: TestHelper.basicChannel.id, user_id: user.id}});
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.USER_ADDED, data: {team_id: TestHelper.basicTeam.id, user_id: user.id}, broadcast: {omit_users: null, user_id: '', channel_id: TestHelper.basicChannel.id, team_id: ''}, seq: 42}));

        assert.ok(store.getState().entities.users.profilesInChannel[TestHelper.basicChannel.id].has(user.id));

        // remove user
        store.dispatch({type: UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL, data: {id: TestHelper.basicChannel.id, user_id: user.id}});
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.USER_REMOVED, data: {remover_id: basicGuestUser.id, user_id: user.id}, broadcast: {omit_users: null, user_id: '', channel_id: TestHelper.basicChannel.id, team_id: ''}, seq: 42}));

        assert.ok(!store.getState().entities.users.profilesInChannel[TestHelper.basicChannel.id].has(user.id));
    });

    it('Websocket Handle User Updated', async () => {
        const user = {...TestHelper.fakeUser(), id: TestHelper.generateId()};
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.USER_UPDATED, data: {user: {id: user.id, create_at: 1495570297229, update_at: 1508253268652, delete_at: 0, username: 'tim', auth_data: '', auth_service: '', email: 'tim@bladekick.com', nickname: '', first_name: 'tester4', last_name: '', position: '', roles: 'system_user', locale: 'en'}}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: ''}, seq: 53}));

        store.subscribe(() => {
            const state = store.getState();
            const entities = state.entities;
            const profiles = entities.users.profiles;

            assert.strictEqual(profiles[user.id].first_name, 'tester4');
        });
    });

    it('Websocket Handle Channel Member Updated', async () => {
        const channelMember = TestHelper.basicChannelMember;
        const mockStore = configureMockStore([thunk]);
        const st = mockStore(initial_state);
        await st.dispatch(Actions.init({websocketUrl: Client4.getUrl().replace(/^http:/, 'ws:')}));
        channelMember.roles = 'channel_user channel_admin';
        const rolesToLoad = channelMember.roles.split(' ');

        nock(Client4.getRolesRoute()).
            post('/names', JSON.stringify(rolesToLoad)).
            reply(200, rolesToLoad);

        mockServer.emit('message', JSON.stringify({
            event: WebsocketEvents.CHANNEL_MEMBER_UPDATED,
            data: {
                channelMember: JSON.stringify(channelMember),
            },
        }));

        await TestHelper.wait(300);
        const storeActions = st.getActions();
        const batch = storeActions.find((a) => a.type === 'BATCH_WS_CHANNEL_MEMBER_UPDATE');
        expect(batch).not.toBeNull();
        const memberAction = batch.payload.find((a) => a.type === ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER);
        expect(memberAction).not.toBeNull();
        const rolesActions = batch.payload.find((a) => a.type === RoleTypes.RECEIVED_ROLES);
        expect(rolesActions).not.toBeNull();
        expect(rolesActions.data).toEqual(rolesToLoad);
    });

    it('Websocket Handle Channel Created', async () => {
        const channelId = TestHelper.basicChannel.id;
        const channel = {id: channelId, display_name: 'test', name: TestHelper.basicChannel.name};
        await store.dispatch(Actions.init({websocketUrl: Client4.getUrl().replace(/^http:/, 'ws:')}));
        store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: channel});
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.CHANNEL_CREATED, data: {channel_id: channelId, team_id: TestHelper.basicTeam.id}, broadcast: {omit_users: null, user_id: 't36kso9nwtdhbm8dbkd6g4eeby', channel_id: '', team_id: ''}, seq: 57}));

        await TestHelper.wait(300);

        const state = store.getState();
        const entities = state.entities;
        const {channels} = entities.channels;

        assert.ok(channels[channel.id]);
    });

    it('Websocket Handle Channel Updated', async () => {
        const channelName = 'Test name';
        const channelId = TestHelper.basicChannel.id;

        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.CHANNEL_UPDATED, data: {channel: `{"id":"${channelId}","create_at":1508253647983,"update_at":1508254198797,"delete_at":0,"team_id":"55pfercbm7bsmd11p5cjpgsbwr","type":"O","display_name":"${channelName}","name":"${TestHelper.basicChannel.name}","header":"header","purpose":"","last_post_at":1508253648004,"total_msg_count":0,"extra_update_at":1508253648001,"creator_id":"${TestHelper.basicUser.id}"}`}, broadcast: {omit_users: null, user_id: '', channel_id: channelId, team_id: ''}, seq: 62}));

        await TestHelper.wait(300);

        const state = store.getState();
        const entities = state.entities;
        const {channels} = entities.channels;

        assert.strictEqual(channels[channelId].display_name, channelName);
    });

    it('Websocket Handle Channel Deleted', async () => {
        const time = Date.now();
        await store.dispatch(TeamActions.selectTeam(TestHelper.basicTeam));
        await store.dispatch(ChannelActions.selectChannel(TestHelper.basicChannel.id));

        store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: {id: TestHelper.generateId(), name: General.DEFAULT_CHANNEL, team_id: TestHelper.basicTeam.id, display_name: General.DEFAULT_CHANNEL}});
        store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: TestHelper.basicChannel});

        nock(Client4.getUserRoute('me')).
            get(`/teams/${TestHelper.basicTeam.id}/channels/members`).
            reply(201, [{user_id: TestHelper.basicUser.id, channel_id: TestHelper.basicChannel.id}]);

        mockServer.emit('message', JSON.stringify({
            event: WebsocketEvents.CHANNEL_DELETED,
            data: {
                channel_id: TestHelper.basicChannel.id,
                delete_at: time,
            },
            broadcast: {
                omit_users: null,
                user_id: '',
                channel_id: '',
                team_id: TestHelper.basicTeam.id,
            },
            seq: 68,
        }));

        await TestHelper.wait(300);

        const state = store.getState();
        const entities = state.entities;
        const {channels, currentChannelId} = entities.channels;

        assert.ok(channels[currentChannelId].name === General.DEFAULT_CHANNEL);
    });

    it('Websocket Handle Channel Unarchive', async () => {
        await store.dispatch(TeamActions.selectTeam(TestHelper.basicTeam));
        await store.dispatch(ChannelActions.selectChannel(TestHelper.basicChannel.id));

        store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: {id: TestHelper.generateId(), name: General.DEFAULT_CHANNEL, team_id: TestHelper.basicTeam.id, display_name: General.DEFAULT_CHANNEL}});
        store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: TestHelper.basicChannel});

        nock(Client4.getUserRoute('me')).
            get(`/teams/${TestHelper.basicTeam.id}/channels/members`).
            reply(201, [{user_id: TestHelper.basicUser.id, channel_id: TestHelper.basicChannel.id}]);

        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.CHANNEL_UNARCHIVE, data: {channel_id: TestHelper.basicChannel.id}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: TestHelper.basicTeam.id}, seq: 68}));

        await TestHelper.wait(300);

        const state = store.getState();
        const entities = state.entities;
        const {channels, currentChannelId} = entities.channels;

        assert.ok(channels[currentChannelId].delete_at === 0);
    });

    it('Websocket Handle Direct Channel', async () => {
        const channel = {id: TestHelper.generateId(), name: TestHelper.basicUser.id + '__' + TestHelper.generateId(), type: 'D'};

        nock(Client4.getChannelsRoute()).
            get(`/${channel.id}/members/me`).
            reply(201, {user_id: TestHelper.basicUser.id, channel_id: channel.id});

        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.DIRECT_ADDED, data: {teammate_id: 'btaxe5msnpnqurayosn5p8twuw'}, broadcast: {omit_users: null, user_id: '', channel_id: channel.id, team_id: ''}, seq: 2}));
        store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: channel});

        await TestHelper.wait(300);

        const {channels} = store.getState().entities.channels;
        assert.ok(Object.keys(channels).length);
    });

    it('Websocket handle user added to team', async () => {
        const team = {id: TestHelper.generateId()};

        nock(Client4.getBaseRoute()).
            get(`/teams/${team.id}`).
            reply(200, team);

        nock(Client4.getBaseRoute()).
            get('/users/me/teams/unread').
            reply(200, [{team_id: team.id, msg_count: 0, mention_count: 0}]);

        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.ADDED_TO_TEAM, data: {team_id: team.id, user_id: TestHelper.basicUser.id}, broadcast: {omit_users: null, user_id: TestHelper.basicUser.id, channel_id: '', team_id: ''}, seq: 2}));

        await TestHelper.wait(300);

        const {teams, myMembers} = store.getState().entities.teams;
        assert.ok(teams[team.id]);
        assert.ok(myMembers[team.id]);

        const member = myMembers[team.id];
        assert.ok(member.hasOwnProperty('mention_count'));
    });

    it('Websocket handle emoji added', async () => {
        const created = {id: '1mmgakhhupfgfm8oug6pooc5no'};
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.EMOJI_ADDED, data: {emoji: `{"id":"1mmgakhhupfgfm8oug6pooc5no","create_at":1508263941321,"update_at":1508263941321,"delete_at":0,"creator_id":"t36kso9nwtdhbm8dbkd6g4eeby","name":"${TestHelper.generateId()}"}`}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: ''}, seq: 2}));

        await TestHelper.wait(200);

        const state = store.getState();

        const emojis = state.entities.emojis.customEmoji;
        assert.ok(emojis);
        assert.ok(emojis[created.id]);
    });

    it('handle license changed', async () => {
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.LICENSE_CHANGED, data: {license: {IsLicensed: 'true'}}}));

        await TestHelper.wait(200);

        const state = store.getState();

        const license = state.entities.general.license;
        assert.ok(license);
        assert.ok(license.IsLicensed);
    });

    it('handle config changed', async () => {
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.CONFIG_CHANGED, data: {config: {EnableCustomEmoji: 'true', EnableLinkPreviews: 'false'}}}));

        await TestHelper.wait(200);

        const state = store.getState();

        const config = state.entities.general.config;
        assert.ok(config);
        assert.ok(config.EnableCustomEmoji === 'true');
        assert.ok(config.EnableLinkPreviews === 'false');
    });

    it('handle open dialog', async () => {
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.OPEN_DIALOG, data: {dialog: JSON.stringify({url: 'someurl', trigger_id: 'sometriggerid', dialog: {}})}}));

        await TestHelper.wait(200);

        const state = store.getState();

        const dialog = state.entities.integrations.dialog;
        assert.ok(dialog);
        assert.ok(dialog.url === 'someurl');
        assert.ok(dialog.trigger_id === 'sometriggerid');
        assert.ok(dialog.dialog);
    });
});

describe('Actions.Websocket doReconnect', () => {
    const mockStore = configureMockStore([thunk]);
    const me = TestHelper.fakeUserWithId();
    const team = TestHelper.fakeTeamWithId();
    const teamMember = TestHelper.fakeTeamMember(me.id, team.id);
    const channel1 = TestHelper.fakeChannelWithId(team.id);
    const channel2 = TestHelper.fakeChannelWithId(team.id);
    const cMember1 = TestHelper.fakeChannelMember(me.id, channel1.id);
    const cMember2 = TestHelper.fakeChannelMember(me.id, channel2.id);

    const currentTeamId = team.id;
    const currentUserId = me.id;
    const currentChannelId = channel1.id;

    const initialState = {
        entities: {
            general: {
                config: {},
            },
            teams: {
                currentTeamId,
                myMembers: {
                    [currentTeamId]: teamMember,
                },
                teams: {
                    [currentTeamId]: team,
                },
            },
            channels: {
                currentChannelId,
                channels: {
                    currentChannelId: channel1,
                },
            },
            users: {
                currentUserId,
                profiles: {
                    [me.id]: me,
                },
            },
            preferences: {
                myPreferences: {},
            },
            posts: {
                posts: {},
                postsInChannel: {},
            },
        },
        websocket: {
            connected: false,
            lastConnectAt: 0,
            lastDisconnectAt: 0,
        },
    };

    beforeAll(async () => {
        return TestHelper.initBasic(Client4);
    });

    beforeEach(() => {
        nock(Client4.getBaseRoute()).
            get('/users/me').
            reply(200, me);

        nock(Client4.getUserRoute('me')).
            get('/teams').
            reply(200, [team]);

        nock(Client4.getUserRoute('me')).
            get('/teams/unread').
            reply(200, [{id: team.id, msg_count: 0, mention_count: 0}]);

        nock(Client4.getBaseRoute()).
            get('/users/me/preferences').
            reply(200, []);

        nock(Client4.getUserRoute('me')).
            get(`/teams/${team.id}/channels/members`).
            reply(200, [cMember1, cMember2]);

        nock(Client4.getChannelRoute(channel1.id)).
            get(`/posts?page=0&per_page=${Posts.POST_CHUNK_SIZE}`).
            reply(200, {
                posts: {
                    post1: {id: 'post1', create_at: 0, message: 'hey'},
                },
                order: ['post1'],
            });
    });

    afterAll(async () => {
        Actions.close()();
        await TestHelper.tearDown();
    });

    it('handle doReconnect', async () => {
        const state = {...initialState};
        const testStore = await mockStore(state);
        const timestamp = 1000;
        const expectedActions = [
            GeneralTypes.WEBSOCKET_SUCCESS,
            'BATCH_WS_RECONNECT',
            'BATCH_GET_POSTS',
        ];

        mockConfigRequest();
        mockTeamMemberRequest([teamMember]);
        mockChanelsRequest(team.id, [channel1, channel2]);

        let rolesToLoad = Array.from(new Set(me.roles.split(' ').
            concat(teamMember.roles.split(' '))));
        mockRolesRequest(rolesToLoad);

        rolesToLoad = Array.from(new Set(cMember1.roles.split(' ').
            concat(cMember2.roles.split(' '))));
        mockRolesRequest(rolesToLoad);

        await testStore.dispatch(Actions.doReconnect(timestamp));
        await TestHelper.wait(300);
        const actionTypes = testStore.getActions().map((a) => a.type);
        expect(actionTypes).toEqual(expectedActions);
    });

    it('handle doReconnect after the current channel was archived or the user left it', async () => {
        const state = {
            ...initialState,
            entities: {
                ...initialState.entities,
                channels: {
                    ...initialState.entities.channels,
                    currentChannelId: 'channel-3',
                },
            },
        };
        const testStore = await mockStore(state);
        const timestamp = 1000;
        const expectedActions = [
            GeneralTypes.WEBSOCKET_SUCCESS,
            'BATCH_WS_RECONNECT',
        ];
        const expectedMissingActions = [
            'BATCH_GET_POSTS',
        ];

        mockConfigRequest();
        mockTeamMemberRequest([teamMember]);
        mockChanelsRequest(team.id, [channel1, channel2]);

        let rolesToLoad = Array.from(new Set(me.roles.split(' ').
            concat(teamMember.roles.split(' '))));
        mockRolesRequest(rolesToLoad);

        rolesToLoad = Array.from(new Set(cMember1.roles.split(' ').
            concat(cMember2.roles.split(' '))));
        mockRolesRequest(rolesToLoad);

        await testStore.dispatch(Actions.doReconnect(timestamp));
        await TestHelper.wait(300);

        const actions = testStore.getActions().map((a) => a.type);

        expect(actions).toEqual(expect.arrayContaining(expectedActions));
        expect(actions).not.toEqual(expect.arrayContaining(expectedMissingActions));
    });

    it('handle doReconnect after the current channel was archived and setting is on', async () => {
        const archived = {
            ...channel1,
            delete_at: 123,
        };
        const state = {
            ...initialState,
            channels: {
                currentChannelId,
                channels: {
                    currentChannelId: archived,
                },
            },
        };
        const testStore = await mockStore(state);
        const timestamp = 1000;
        const expectedActions = [
            GeneralTypes.WEBSOCKET_SUCCESS,
            'BATCH_WS_RECONNECT',
        ];

        mockConfigRequest({ExperimentalViewArchivedChannels: 'true'});
        mockTeamMemberRequest([teamMember]);
        mockChanelsRequest(team.id, [archived, channel2]);

        let rolesToLoad = Array.from(new Set(me.roles.split(' ').
            concat(teamMember.roles.split(' '))));
        mockRolesRequest(rolesToLoad);

        rolesToLoad = Array.from(new Set(cMember1.roles.split(' ').
            concat(cMember2.roles.split(' '))));
        mockRolesRequest(rolesToLoad);

        await testStore.dispatch(Actions.doReconnect(timestamp));
        await TestHelper.wait(300);

        const actions = testStore.getActions().map((a) => a.type);
        expect(actions).toEqual(expect.arrayContaining(expectedActions));
    });

    it('handle doReconnect after the current channel was archived and setting is off', async () => {
        const archived = {
            ...channel1,
            delete_at: 123,
        };

        const state = {
            ...initialState,
            channels: {
                currentChannelId,
                channels: {
                    currentChannelId: archived,
                },
            },
        };
        const testStore = await mockStore(state);
        const timestamp = 1000;
        const expectedActions = [
            GeneralTypes.WEBSOCKET_SUCCESS,
            'BATCH_WS_RECONNECT',
        ];
        const expectedMissingActions = [
            'BATCH_GET_POSTS',
        ];

        mockConfigRequest({ExperimentalViewArchivedChannels: 'false'});
        mockTeamMemberRequest([teamMember]);
        mockChanelsRequest(team.id, [archived, channel2]);

        let rolesToLoad = Array.from(new Set(me.roles.split(' ').
            concat(teamMember.roles.split(' '))));
        mockRolesRequest(rolesToLoad);

        rolesToLoad = Array.from(new Set(cMember1.roles.split(' ').
            concat(cMember2.roles.split(' '))));
        mockRolesRequest(rolesToLoad);

        await testStore.dispatch(Actions.doReconnect(timestamp));
        await TestHelper.wait(300);

        const actions = testStore.getActions().map((a) => a.type);
        expect(actions).toEqual(expectedActions);
        expect(actions).not.toEqual(expect.arrayContaining(expectedMissingActions));
    });

    it('handle doReconnect after user left current team', async () => {
        const state = {...initialState};
        state.entities.teams.myMembers = {};
        const testStore = await mockStore(state);
        const timestamp = 1000;
        const expectedActions = [
            GeneralTypes.WEBSOCKET_SUCCESS,
            'BATCH_WS_LEAVE_TEAM',
            'BATCH_WS_RECONNECT',
        ];
        const expectedMissingActions = [
            'BATCH_GET_POSTS',
        ];

        mockConfigRequest();
        mockTeamMemberRequest([]);
        mockChanelsRequest(team.id, [channel1, channel2]);

        let rolesToLoad = me.roles.split(' ');
        mockRolesRequest(rolesToLoad);

        rolesToLoad = Array.from(new Set(cMember1.roles.split(' ').
            concat(cMember2.roles.split(' '))));
        mockRolesRequest(rolesToLoad);

        await testStore.dispatch(Actions.doReconnect(timestamp));
        await TestHelper.wait(300);
        const actions = testStore.getActions().map((a) => a.type);
        expect(actions).toEqual(expectedActions);
        expect(actions).not.toEqual(expect.arrayContaining(expectedMissingActions));
    });
});

describe('Actions.Websocket notVisibleUsersActions', () => {
    configureMockStore([thunk]);

    const channel1 = TestHelper.fakeChannelWithId('');
    const channel2 = TestHelper.fakeChannelWithId('');

    const me = TestHelper.fakeUserWithId();
    const user = TestHelper.fakeUserWithId();
    const user2 = TestHelper.fakeUserWithId();
    const user3 = TestHelper.fakeUserWithId();
    const user4 = TestHelper.fakeUserWithId();
    const user5 = TestHelper.fakeUserWithId();

    it('should do nothing if the known users and the profiles list are the same', () => {
        const membersInChannel = {
            [channel1.id]: {
                [user.id]: {channel_id: channel1.id, user_id: user.id},
                [user2.id]: {channel_id: channel1.id, user_id: user2.id},
            },
            [channel2.id]: {
                [user3.id]: {channel_id: channel2.id, user_id: user3.id},
            },
        };

        const profiles = {
            [me.id]: me,
            [user.id]: user,
            [user2.id]: user2,
            [user3.id]: user3,
        };

        const state = {
            entities: {
                channels: {
                    membersInChannel,
                },
                users: {
                    currentUserId: me.id,
                    profiles,
                },
            },
        };

        const actions = Actions.notVisibleUsersActions(state);
        expect(actions.length).toEqual(0);
    });

    it('should do nothing if there are known users in my memberships but not in the profiles list', () => {
        const membersInChannel = {
            [channel1.id]: {
                [user.id]: {channel_id: channel1.id, user_id: user.id},
                [user2.id]: {channel_id: channel1.id, user_id: user2.id},
            },
            [channel2.id]: {
                [user3.id]: {channel_id: channel2.id, user_id: user3.id},
            },
        };

        const profiles = {
            [me.id]: me,
            [user3.id]: user3,
        };

        const state = {
            entities: {
                channels: {
                    membersInChannel,
                },
                users: {
                    currentUserId: me.id,
                    profiles,
                },
            },
        };

        const actions = Actions.notVisibleUsersActions(state);
        expect(actions.length).toEqual(0);
    });

    it('should remove the users if there are unknown users in the profiles list', async () => {
        const membersInChannel = {
            [channel1.id]: {
                [user.id]: {channel_id: channel1.id, user_id: user.id},
            },
            [channel2.id]: {
                [user3.id]: {channel_id: channel2.id, user_id: user3.id},
            },
        };

        const profiles = {
            [me.id]: me,
            [user.id]: user,
            [user2.id]: user2,
            [user3.id]: user3,
            [user4.id]: user4,
            [user5.id]: user5,
        };

        const state = {
            entities: {
                channels: {
                    membersInChannel,
                },
                users: {
                    currentUserId: me.id,
                    profiles,
                },
            },
        };

        const expectedAction = [
            {type: UserTypes.PROFILE_NO_LONGER_VISIBLE, data: {user_id: user2.id}},
            {type: UserTypes.PROFILE_NO_LONGER_VISIBLE, data: {user_id: user4.id}},
            {type: UserTypes.PROFILE_NO_LONGER_VISIBLE, data: {user_id: user5.id}},
        ];
        const actions = Actions.notVisibleUsersActions(state);
        expect(actions.length).toEqual(3);
        expect(actions).toEqual(expectedAction);
    });
});

describe('Actions.Websocket handleUserTypingEvent', () => {
    const mockStore = configureMockStore([thunk]);

    const currentUserId = 'user-id';
    const otherUserId = 'other-user-id';
    const currentChannelId = 'channel-id';
    const otherChannelId = 'other-channel-id';

    const initialState = {
        entities: {
            general: {
                config: {},
            },
            channels: {
                currentChannelId,
                channels: {
                    currentChannelId: {
                        id: currentChannelId,
                        name: 'channel',
                    },
                },
            },
            users: {
                currentUserId,
                profiles: {
                    [currentUserId]: {},
                    [otherUserId]: {},
                },
                statuses: {
                    [currentUserId]: General.ONLINE,
                    [otherUserId]: General.OFFLINE,
                },
            },
            preferences: {
                myPreferences: {},
            },
        },
    };

    it('dispatches actions for current channel if other user is typing', async () => {
        const state = {...initialState};
        const testStore = await mockStore(state);
        const msg = {broadcast: {channel_id: currentChannelId}, data: {parent_id: 'parent-id', user_id: otherUserId}};

        nock(Client4.getUsersRoute()).
            post('/status/ids', JSON.stringify([otherUserId])).
            reply(200, ['away']);

        const expectedActionsTypes = [
            WebsocketEvents.TYPING,
            UserTypes.RECEIVED_STATUSES,
        ];

        await testStore.dispatch(Actions.handleUserTypingEvent(msg));
        await TestHelper.wait(300);
        const actionTypes = testStore.getActions().map((action) => action.type);
        expect(actionTypes).toEqual(expectedActionsTypes);
    });

    it('does not dispatch actions for non current channel', async () => {
        const state = {...initialState};
        const testStore = await mockStore(state);
        const msg = {broadcast: {channel_id: otherChannelId}, data: {parent_id: 'parent-id', user_id: otherUserId}};

        const expectedActionsTypes = [];

        await testStore.dispatch(Actions.handleUserTypingEvent(msg));
        const actionTypes = testStore.getActions().map((action) => action.type);
        expect(actionTypes).toEqual(expectedActionsTypes);
    });
});