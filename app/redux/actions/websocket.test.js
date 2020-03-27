// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';
import nock from 'nock';
import {Server, WebSocket as MockWebSocket} from 'mock-socket';
import thunk from 'redux-thunk';
import configureMockStore from 'redux-mock-store';

import * as PostSelectors from '@redux/selectors/entities/posts';
import * as Actions from 'actions/websocket';
import * as ChannelActions from 'actions/channels';
import * as PostActions from 'actions/posts';
import * as PreferenceActions from 'actions/preferences';
import * as TeamActions from 'actions/teams';
import * as UserActions from 'actions/users';
import EventEmitter from '@redux/utils/event_emitter';
import {loadRolesIfNeeded as mockLoadRolesIfNeeded} from 'actions/roles';
import {batchActions} from '@redux/types/actions';

import {Client4} from '@redux/client';
import {General, Posts, RequestStatus, WebsocketEvents} from '../constants';
import {
    PostTypes,
    TeamTypes,
    UserTypes,
    ChannelTypes,
    GeneralTypes,
} from '@redux/action_types';
import TestHelper from 'test/test_helper';
import configureStore from 'test/test_store';

jest.mock('actions/roles', () => ({
    loadRolesIfNeeded: jest.fn((...args) => ({type: 'MOCK_LOAD_ROLES_IF_NEEDED', args})),
}));

describe('Actions.Websocket', () => {
    let store;
    let mockServer;
    beforeAll(async () => {
        store = await configureStore();
        await TestHelper.initBasic(Client4);

        const connUrl = (Client4.getUrl() + '/api/v4/websocket').replace(/^http:/, 'ws:');
        mockServer = new Server(connUrl);
        return store.dispatch(Actions.init(
            'web',
            null,
            null,
            MockWebSocket,
        ));
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
        entities = store.getState().entities;
        posts = entities.posts.posts;
        const postId = Object.keys(posts)[0];
        assert.ok(posts[postId].message.indexOf('Unit Test') > -1);
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
        await store.dispatch(Actions.init(
            'web',
            null,
            null,
            MockWebSocket,
        ));

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
        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.POST_EDITED, data: {post: `{"id": "71k8gz5ompbpfkrzaxzodffj8w","create_at": 1508245311774,"update_at": 1508247709215,"edit_at": 1508247709215,"delete_at": 0,"is_pinned": false,"user_id": "${TestHelper.basicUser.id}","channel_id": "${TestHelper.basicChannel.id}","root_id": "","parent_id": "","original_id": "","message": "Unit Test (edited)","type": "","props": {},"hashtags": "","pending_post_id": ""}`}, broadcast: {omit_users: null, user_id: '', channel_id: '18k9ffsuci8xxm7ak68zfdyrce', team_id: ''}, seq: 2}));

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
        await store.dispatch(Actions.init(
            'web',
            null,
            null,
            MockWebSocket,
        ));

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
        await store.dispatch(Actions.init(
            'web',
            null,
            null,
            MockWebSocket,
        ));

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

    it('Websocket Handle Reaction Added to Post', (done) => {
        async function test() {
            const emoji = '+1';
            const post = {id: 'w7yo9377zbfi9mgiq5gbfpn3ha'};
            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.REACTION_ADDED, data: {reaction: `{"user_id":"${TestHelper.basicUser.id}","post_id":"w7yo9377zbfi9mgiq5gbfpn3ha","emoji_name":"${emoji}","create_at":1508249125852}`}, broadcast: {omit_users: null, user_id: '', channel_id: TestHelper.basicChannel.id, team_id: ''}, seq: 12}));

            setTimeout(() => {
                const nextEntities = store.getState().entities;
                const {reactions} = nextEntities.posts;
                const reactionsForPost = reactions[post.id];

                assert.ok(reactionsForPost.hasOwnProperty(`${TestHelper.basicUser.id}-${emoji}`));
                done();
            }, 500);
        }

        test();
    });

    it('Websocket Handle Reaction Removed from Post', (done) => {
        async function test() {
            const emoji = '+1';
            const post = {id: 'w7yo9377zbfi9mgiq5gbfpn3ha'};
            store.dispatch({type: PostTypes.RECEIVED_REACTION, data: {user_id: TestHelper.basicUser.id, post_id: post.id, emoji_name: '+1'}});
            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.REACTION_REMOVED, data: {reaction: `{"user_id":"${TestHelper.basicUser.id}","post_id":"w7yo9377zbfi9mgiq5gbfpn3ha","emoji_name":"+1","create_at":0}`}, broadcast: {omit_users: null, user_id: '', channel_id: TestHelper.basicChannel.id, team_id: ''}, seq: 18}));

            function checkForRemove() {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const nextEntities = store.getState().entities;
                        const {reactions} = nextEntities.posts;
                        const reactionsForPost = reactions[post.id];

                        assert.ok(!reactionsForPost.hasOwnProperty(`${TestHelper.basicUser.id}-${emoji}`));
                        resolve();
                        done();
                    }, 500);
                });
            }

            await checkForRemove();
        }

        test();
    });

    // If we move this test lower it will fail cause of a permissions issue
    it('Websocket handle team updated', (done) => {
        async function test() {
            const team = {id: '55pfercbm7bsmd11p5cjpgsbwr'};
            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.UPDATE_TEAM, data: {team: `{"id":"55pfercbm7bsmd11p5cjpgsbwr","create_at":1495553950859,"update_at":1508250370054,"delete_at":0,"display_name":"${TestHelper.basicTeam.display_name}","name":"${TestHelper.basicTeam.name}","description":"description","email":"","type":"O","company_name":"","allowed_domains":"","invite_id":"m93f54fu5bfntewp8ctwonw19w","allow_open_invite":true}`}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: ''}, seq: 26}));

            setTimeout(() => {
                const entities = store.getState().entities;
                const {teams} = entities.teams;
                const updated = teams[team.id];
                assert.ok(updated);
                assert.strictEqual(updated.allow_open_invite, true);
                done();
            }, 500);
        }

        test();
    });

    it('Websocket handle team patched', (done) => {
        async function test() {
            const team = {id: '55pfercbm7bsmd11p5cjpgsbwr'};
            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.UPDATE_TEAM, data: {team: `{"id":"55pfercbm7bsmd11p5cjpgsbwr","create_at":1495553950859,"update_at":1508250370054,"delete_at":0,"display_name":"${TestHelper.basicTeam.display_name}","name":"${TestHelper.basicTeam.name}","description":"description","email":"","type":"O","company_name":"","allowed_domains":"","invite_id":"m93f54fu5bfntewp8ctwonw19w","allow_open_invite":true}`}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: ''}, seq: 26}));

            setTimeout(() => {
                const entities = store.getState().entities;
                const {teams} = entities.teams;
                const updated = teams[team.id];
                assert.ok(updated);
                assert.strictEqual(updated.allow_open_invite, true);
                done();
            }, 500);
        }

        test();
    });

    it('WebSocket Leave Team', async () => {
        const team = TestHelper.basicTeam;
        store.dispatch({type: UserTypes.RECEIVED_ME, data: TestHelper.basicUser});
        store.dispatch({type: TeamTypes.RECEIVED_TEAM, data: TestHelper.basicTeam});
        store.dispatch({type: TeamTypes.RECEIVED_MY_TEAM_MEMBER, data: TestHelper.basicTeamMember});
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
        channelMember.roles = 'channel_user channel_admin';
        mockServer.emit('message', JSON.stringify({
            event: WebsocketEvents.CHANNEL_MEMBER_UPDATED,
            data: {
                channelMember: JSON.stringify(channelMember),
            },
        }));
        expect(mockLoadRolesIfNeeded).toHaveBeenCalledTimes(1);
        expect(mockLoadRolesIfNeeded).toHaveBeenCalledWith(channelMember.roles.split(' '));
        store.subscribe(() => {
            const state = store.getState();
            expect(state.entities.channels.membersInChannel[channelMember.channel_id][channelMember.user_id].roles).toEqual('channel_user channel_admin');
        });
    });

    it('Websocket Handle Channel Created', (done) => {
        async function test() {
            const channel = {id: '95tpi6f4apy39k6zxuo3msxzhy', display_name: 'test'};
            store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: channel});
            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.CHANNEL_CREATED, data: {channel_id: '95tpi6f4apy39k6zxuo3msxzhy', team_id: TestHelper.basicTeam.id}, broadcast: {omit_users: null, user_id: 't36kso9nwtdhbm8dbkd6g4eeby', channel_id: '', team_id: ''}, seq: 57}));

            setTimeout(() => {
                const state = store.getState();
                const entities = state.entities;
                const {channels} = entities.channels;

                assert.ok(channels[channel.id]);
                done();
            }, 1000);
        }

        test();
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

    it('Websocket Handle Channel Converted', async () => {
        const channelType = 'P';
        const channelId = TestHelper.basicChannel.id;

        nock(Client4.getChannelsRoute()).
            get(`/${TestHelper.basicChannel.id}`).
            reply(200, {...TestHelper.basicChannel, type: channelType});

        mockServer.emit('message', JSON.stringify({
            event: WebsocketEvents.CHANNEL_CONVERTED,
            data: {channel_id: channelId},
            broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: TestHelper.basicTeam.id},
            seq: 65},
        ));

        store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: {...TestHelper.basicChannel, type: channelType}});

        await TestHelper.wait(300);

        const state = store.getState();
        const entities = state.entities;
        const {channels} = entities.channels;

        assert.strictEqual(channels[channelId].type, channelType);
    });

    it('Websocket Handle Channel Deleted', (done) => {
        async function test() {
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

            setTimeout(() => {
                const state = store.getState();
                const entities = state.entities;
                const {channels, currentChannelId} = entities.channels;

                assert.ok(channels[currentChannelId].name === General.DEFAULT_CHANNEL);
                done();
            }, 500);
        }

        test();
    });

    it('Websocket Handle Channel Unarchive', async (done) => {
        await store.dispatch(TeamActions.selectTeam(TestHelper.basicTeam));
        await store.dispatch(ChannelActions.selectChannel(TestHelper.basicChannel.id));

        store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: {id: TestHelper.generateId(), name: General.DEFAULT_CHANNEL, team_id: TestHelper.basicTeam.id, display_name: General.DEFAULT_CHANNEL}});
        store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: TestHelper.basicChannel});

        nock(Client4.getUserRoute('me')).
            get(`/teams/${TestHelper.basicTeam.id}/channels/members`).
            reply(201, [{user_id: TestHelper.basicUser.id, channel_id: TestHelper.basicChannel.id}]);

        mockServer.emit('message', JSON.stringify({event: WebsocketEvents.CHANNEL_UNARCHIVE, data: {channel_id: TestHelper.basicChannel.id}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: TestHelper.basicTeam.id}, seq: 68}));

        setTimeout(() => {
            const state = store.getState();
            const entities = state.entities;
            const {channels, currentChannelId} = entities.channels;

            assert.ok(channels[currentChannelId].delete_at === 0);
            done();
        }, 500);
    });

    it('Websocket Handle Direct Channel', (done) => {
        async function test() {
            const channel = {id: TestHelper.generateId(), name: TestHelper.basicUser.id + '__' + TestHelper.generateId(), type: 'D'};

            nock(Client4.getChannelsRoute()).
                get(`/${channel.id}/members/me`).
                reply(201, {user_id: TestHelper.basicUser.id, channel_id: channel.id});

            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.DIRECT_ADDED, data: {teammate_id: 'btaxe5msnpnqurayosn5p8twuw'}, broadcast: {omit_users: null, user_id: '', channel_id: channel.id, team_id: ''}, seq: 2}));
            store.dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: channel});

            setTimeout(() => {
                const {channels} = store.getState().entities.channels;
                assert.ok(Object.keys(channels).length);
                done();
            }, 500);
        }

        test();
    });

    it('Websocket handle user added to team', (done) => {
        async function test() {
            const team = {id: TestHelper.generateId()};

            nock(Client4.getBaseRoute()).
                get(`/teams/${team.id}`).
                reply(200, team);

            nock(Client4.getBaseRoute()).
                get('/users/me/teams/members').
                reply(200, [{team_id: team.id, user_id: TestHelper.basicUser.id}]);

            nock(Client4.getBaseRoute()).
                get('/users/me/teams/unread').
                reply(200, [{team_id: team.id, msg_count: 0, mention_count: 0}]);

            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.ADDED_TO_TEAM, data: {team_id: team.id, user_id: TestHelper.basicUser.id}, broadcast: {omit_users: null, user_id: TestHelper.basicUser.id, channel_id: '', team_id: ''}, seq: 2}));

            setTimeout(() => {
                const {teams, myMembers} = store.getState().entities.teams;
                assert.ok(teams[team.id]);
                assert.ok(myMembers[team.id]);

                const member = myMembers[team.id];
                assert.ok(member.hasOwnProperty('mention_count'));
                done();
            }, 500);
        }

        test();
    });

    it('Websocket handle emoji added', (done) => {
        async function test() {
            const created = {id: '1mmgakhhupfgfm8oug6pooc5no'};
            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.EMOJI_ADDED, data: {emoji: `{"id":"1mmgakhhupfgfm8oug6pooc5no","create_at":1508263941321,"update_at":1508263941321,"delete_at":0,"creator_id":"t36kso9nwtdhbm8dbkd6g4eeby","name":"${TestHelper.generateId()}"}`}, broadcast: {omit_users: null, user_id: '', channel_id: '', team_id: ''}, seq: 2}));

            await TestHelper.wait(200);

            const state = store.getState();

            const emojis = state.entities.emojis.customEmoji;
            assert.ok(emojis);
            assert.ok(emojis[created.id]);
            done();
        }

        test();
    });

    it('handle license changed', (done) => {
        async function test() {
            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.LICENSE_CHANGED, data: {license: {IsLicensed: 'true'}}}));

            await TestHelper.wait(200);

            const state = store.getState();

            const license = state.entities.general.license;
            assert.ok(license);
            assert.ok(license.IsLicensed);
            done();
        }

        test();
    });

    it('handle config changed', (done) => {
        async function test() {
            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.CONFIG_CHANGED, data: {config: {EnableCustomEmoji: 'true', EnableLinkPreviews: 'false'}}}));

            await TestHelper.wait(200);

            const state = store.getState();

            const config = state.entities.general.config;
            assert.ok(config);
            assert.ok(config.EnableCustomEmoji === 'true');
            assert.ok(config.EnableLinkPreviews === 'false');
            done();
        }

        test();
    });

    it('handle open dialog', (done) => {
        async function test() {
            mockServer.emit('message', JSON.stringify({event: WebsocketEvents.OPEN_DIALOG, data: {dialog: JSON.stringify({url: 'someurl', trigger_id: 'sometriggerid', dialog: {}})}}));

            await TestHelper.wait(200);

            const state = store.getState();

            const dialog = state.entities.integrations.dialog;
            assert.ok(dialog);
            assert.ok(dialog.url === 'someurl');
            assert.ok(dialog.trigger_id === 'sometriggerid');
            assert.ok(dialog.dialog);
            done();
        }

        test();
    });
});

describe('Actions.Websocket doReconnect', () => {
    const mockStore = configureMockStore([thunk]);
    const me = TestHelper.fakeUserWithId();

    const currentTeamId = 'team-id';
    const currentUserId = me.id;
    const currentChannelId = 'channel-id';

    const initialState = {
        entities: {
            general: {
                config: {},
            },
            teams: {
                currentTeamId,
                myMembers: {
                    [currentTeamId]: [currentUserId],
                },
                teams: {
                    [currentTeamId]: {
                        id: currentTeamId,
                    },
                },
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
                    [me.id]: me,
                },
            },
            preferences: {
                myPreferences: {},
            },
        },
    };

    const MOCK_GET_STATUSES_BY_IDS = 'MOCK_GET_STATUSES_BY_IDS';
    const MOCK_MY_TEAM_UNREADS = 'MOCK_MY_TEAM_UNREADS';
    const MOCK_GET_MY_TEAMS = 'MOCK_GET_MY_TEAMS';
    const MOCK_GET_MY_TEAM_MEMBERS = 'MOCK_GET_MY_TEAM_MEMBERS';
    const MOCK_GET_POSTS = 'MOCK_GET_POSTS';
    const MOCK_CHANNELS_REQUEST = 'MOCK_CHANNELS_REQUEST';
    const MOCK_CHECK_FOR_MODIFIED_USERS = 'MOCK_CHECK_FOR_MODIFIED_USERS';
    const MOCK_GET_PREFERENCES = 'MOCK_GET_PREFERENCES';

    beforeAll(() => {
        UserActions.getStatusesByIds = jest.fn().mockReturnValue({
            type: MOCK_GET_STATUSES_BY_IDS,
        });
        nock(Client4.getBaseRoute()).
            get('/status/ids').
            reply(200, []);

        TeamActions.getMyTeamUnreads = jest.fn().mockReturnValue({
            type: MOCK_MY_TEAM_UNREADS,
        });
        nock(Client4.getBaseRoute()).
            get('/users/me/teams/unread').
            reply(200, []);

        TeamActions.getMyTeams = jest.fn().mockReturnValue({
            type: MOCK_GET_MY_TEAMS,
        });
        nock(Client4.getBaseRoute()).
            get('/users/me/teams').
            reply(200, []);

        TeamActions.getMyTeamMembers = jest.fn().mockReturnValue({
            type: MOCK_GET_MY_TEAM_MEMBERS,
        });
        nock(Client4.getBaseRoute()).
            get(`/users/me/teams/${currentTeamId}/channels/members`).
            reply(200, []);

        PostActions.getPosts = jest.fn().mockReturnValue({
            type: MOCK_GET_POSTS,
        });
        nock(Client4.getBaseRoute()).
            get(`/channels/${currentChannelId}/posts`).
            reply(200, []);

        ChannelActions.fetchMyChannelsAndMembers = jest.fn().mockReturnValue({
            type: MOCK_CHANNELS_REQUEST, data: [], teamId: currentTeamId, sync: true,
        });
        nock(Client4.getBaseRoute()).
            get(`/users/me/teams/${currentTeamId}/channels`).
            reply(200, []);
        nock(Client4.getBaseRoute()).
            get(`/users/me/teams/${currentTeamId}/channels/members`).
            reply(200, []);

        UserActions.checkForModifiedUsers = jest.fn().mockReturnValue({
            type: MOCK_CHECK_FOR_MODIFIED_USERS,
        });
        nock(Client4.getBaseRoute()).
            get('/users/ids').
            reply(200, []);

        PreferenceActions.getMyPreferences = jest.fn().mockReturnValue({
            type: MOCK_GET_PREFERENCES,
        });
        nock(Client4.getBaseRoute()).
            get('/users/me/preferences').
            reply(200, []);
    });

    it('handle doReconnect', async () => {
        const state = {...initialState};
        const testStore = await mockStore(state);

        const timestamp = 1000;
        const expectedActions = [
            {type: MOCK_GET_PREFERENCES},
            {type: MOCK_GET_STATUSES_BY_IDS},
            {type: MOCK_MY_TEAM_UNREADS},
            {type: MOCK_GET_MY_TEAMS},
            {type: MOCK_GET_MY_TEAM_MEMBERS},
            {type: MOCK_CHANNELS_REQUEST, data: [], teamId: currentTeamId, sync: true},
            {type: MOCK_CHECK_FOR_MODIFIED_USERS},
            {type: GeneralTypes.WEBSOCKET_SUCCESS, timestamp, data: null},
        ];

        await testStore.dispatch(Actions.doReconnect(timestamp));

        expect(testStore.getActions()).toEqual(expectedActions);
    });

    it('handle doReconnect after the current channel was archived or the user left it', async () => {
        const state = {...initialState};
        const testStore = await mockStore(state);

        const timestamp = 1000;
        const expectedActions = [
            {type: MOCK_GET_PREFERENCES},
            {type: MOCK_GET_STATUSES_BY_IDS},
            {type: MOCK_MY_TEAM_UNREADS},
            {type: MOCK_GET_MY_TEAMS},
            {type: MOCK_GET_MY_TEAM_MEMBERS},
            {type: MOCK_CHANNELS_REQUEST, data: [], teamId: currentTeamId, sync: true},
            {type: MOCK_CHECK_FOR_MODIFIED_USERS},
            {type: GeneralTypes.WEBSOCKET_SUCCESS, timestamp, data: null},
        ];

        const expectedMissingActions = [
            {type: MOCK_GET_POSTS},
        ];

        await testStore.dispatch(Actions.doReconnect(timestamp));

        const actions = testStore.getActions();
        expect(actions).toEqual(expect.arrayContaining(expectedActions));
        expect(actions).not.toEqual(expect.arrayContaining(expectedMissingActions));
    });

    it('handle doReconnect after the current channel was archived and setting is on', async () => {
        const state = {
            ...initialState,
            general: {
                config: {
                    ExperimentalViewArchivedChannels: 'true',
                },
            },
            channels: {
                currentChannelId,
                channels: {
                    currentChannelId: {
                        id: currentChannelId,
                        name: 'channel',
                        delete_at: 123,
                    },
                },
            },
        };
        const testStore = await mockStore(state);

        const timestamp = 1000;
        const expectedActions = [
            {type: MOCK_GET_PREFERENCES},
            {type: MOCK_GET_STATUSES_BY_IDS},
            {type: MOCK_MY_TEAM_UNREADS},
            {type: MOCK_GET_MY_TEAMS},
            {type: MOCK_GET_MY_TEAM_MEMBERS},
            {type: MOCK_CHANNELS_REQUEST, data: [], teamId: currentTeamId, sync: true},
            {type: MOCK_CHECK_FOR_MODIFIED_USERS},
            {type: GeneralTypes.WEBSOCKET_SUCCESS, timestamp, data: null},
        ];

        const expectedMissingActions = [
            {type: MOCK_GET_POSTS},
        ];

        await testStore.dispatch(Actions.doReconnect(timestamp));

        const actions = testStore.getActions();
        expect(actions).toEqual(expect.arrayContaining(expectedActions));
        expect(actions).not.toEqual(expect.arrayContaining(expectedMissingActions));
    });

    it('handle doReconnect after user left current team', async () => {
        const state = {...initialState};
        state.entities.teams.myMembers = {};
        const testStore = await mockStore(state);

        const timestamp = 1000;
        const expectedActions = [
            {type: MOCK_GET_STATUSES_BY_IDS},
            {type: MOCK_MY_TEAM_UNREADS},
            {type: MOCK_GET_MY_TEAMS},
            {type: MOCK_GET_MY_TEAM_MEMBERS},
            {type: TeamTypes.LEAVE_TEAM, data: state.entities.teams.teams[currentTeamId]},
            {type: MOCK_CHECK_FOR_MODIFIED_USERS},
            {type: GeneralTypes.WEBSOCKET_SUCCESS, timestamp, data: null},
        ];

        const expectedMissingActions = [
            {type: MOCK_GET_POSTS},
            {type: MOCK_CHANNELS_REQUEST},
        ];

        await testStore.dispatch(Actions.doReconnect(timestamp));

        const actions = testStore.getActions();
        expect(actions).toEqual(expect.arrayContaining(expectedActions));
        expect(actions).not.toEqual(expect.arrayContaining(expectedMissingActions));
    });
});

describe('Actions.Websocket removeNotVisibleUsers', () => {
    const mockStore = configureMockStore([thunk]);

    const channel1 = TestHelper.fakeChannelWithId('');
    const channel2 = TestHelper.fakeChannelWithId('');

    const me = TestHelper.fakeUserWithId();
    const user = TestHelper.fakeUserWithId();
    const user2 = TestHelper.fakeUserWithId();
    const user3 = TestHelper.fakeUserWithId();
    const user4 = TestHelper.fakeUserWithId();
    const user5 = TestHelper.fakeUserWithId();

    it('should do nothing if the known users and the profiles list are the same', async () => {
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
        const testStore = await mockStore(state);
        await testStore.dispatch(Actions.removeNotVisibleUsers());
        const actions = testStore.getActions();
        expect(actions.length).toEqual(0);
    });

    it('should do nothing if there are known users in my memberships but not in the profiles list', async () => {
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
        const testStore = await mockStore(state);
        await testStore.dispatch(Actions.removeNotVisibleUsers());
        const actions = testStore.getActions();
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
        const testStore = await mockStore(state);
        await testStore.dispatch(Actions.removeNotVisibleUsers());

        const expectedAction = batchActions([
            {type: UserTypes.PROFILE_NO_LONGER_VISIBLE, data: {user_id: user2.id}},
            {type: UserTypes.PROFILE_NO_LONGER_VISIBLE, data: {user_id: user4.id}},
            {type: UserTypes.PROFILE_NO_LONGER_VISIBLE, data: {user_id: user5.id}},
        ]);
        const actions = testStore.getActions();
        expect(actions.length).toEqual(1);
        expect(actions[0]).toEqual(expectedAction);
    });
});

describe('Actions.Websocket handleUserTypingEvent', () => {
    const mockStore = configureMockStore([thunk]);

    const MOCK_GET_STATUSES_BY_IDS = 'MOCK_GET_STATUSES_BY_IDS';
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
                    [currentUserId]: {},
                    [otherUserId]: {},
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

        const expectedActionsTypes = [
            WebsocketEvents.TYPING,
            MOCK_GET_STATUSES_BY_IDS,
        ];

        await testStore.dispatch(Actions.handleUserTypingEvent(msg));
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
