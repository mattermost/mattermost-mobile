// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'service/actions/websocket';
import * as ChannelActions from 'service/actions/channels';
import * as TeamActions from 'service/actions/teams';
import * as RootActions from 'app/actions/views/root';

import Client from 'service/client';
import configureStore from 'app/store';
import {Constants, RequestStatus} from 'service/constants';
import TestHelper from 'test/test_helper';

describe('Actions.Websocket', () => {
    it('WebSocket Connect', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const ws = store.getState().requests.general.websocket;
                if (ws.status === RequestStatus.SUCCESS || ws.status === RequestStatus.FAILURE) {
                    if (ws.error) {
                        done(new Error(JSON.stringify(ws.error)));
                    }

                    // we don't need to dispatch when the WS closes
                    Actions.close()();
                    done();
                }
            });

            Actions.init()(store.dispatch, store.getState);
        });
    });

    it('WebSocket Close', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const ws = store.getState().requests.general.websocket;
                if (ws.status === RequestStatus.SUCCESS) {
                    Actions.close()(store.dispatch, store.getState);
                } else if (ws.status === RequestStatus.FAILURE) {
                    assert.strictEqual(ws.error, 'Closed');
                    done();
                }
            });

            Actions.init()(store.dispatch, store.getState);
        });
    });

    it('WebSocket Leave Team', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const client = TestHelper.createClient();
            const user = await client.createUser(TestHelper.fakeUser());
            await client.login(user.email, 'password1');
            const team = await client.createTeam(TestHelper.fakeTeam());
            const channel = await client.createChannel(TestHelper.fakeChannel(team.id));
            await client.addUserToTeam(team.id, TestHelper.basicUser.id);
            await client.addChannelMember(team.id, channel.id, TestHelper.basicUser.id);

            await RootActions.setStoreFromLocalData({url: Client.getUrl(), token: Client.getToken()})(store.dispatch, store.getState);
            await TeamActions.selectTeam(team)(store.dispatch, store.getState);
            await ChannelActions.selectChannel(channel.id)(store.dispatch, store.getState);
            await Actions.init()(store.dispatch, store.getState);

            let currentValue = 0;
            store.subscribe(async () => {
                const previousValue = currentValue;
                if (currentValue === 0) {
                    currentValue++;
                    await client.removeUserFromTeam(team.id, TestHelper.basicUser.id);
                }

                const entities = store.getState().entities;
                const {currentId, myMembers} = entities.teams;
                const currentChannelId = entities.channels.currentId;

                if (previousValue !== currentValue) {
                    assert.strictEqual(currentId, '');
                    assert.strictEqual(currentChannelId, '');
                    assert.ifError(myMembers[team.id]);

                    // we don't need to dispatch when the WS closes
                    Actions.close()();
                    done();
                }
            });
        });
    }).timeout(3500);

    it('Websocket Handle New Post', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const client = TestHelper.createClient();
            const user = await client.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            await Client.addChannelMember(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                user.id);

            store.subscribe(async () => {
                const entities = store.getState().entities;
                const {posts, postsByChannel} = entities.posts;
                const profiles = entities.users.profiles;
                const statuses = entities.users.statuses;
                const channelId = TestHelper.basicChannel.id;

                if (postsByChannel[channelId] && Object.keys(statuses).length && Object.keys(profiles).length) {
                    const postId = postsByChannel[channelId][0];
                    assert.ok(posts[postId].message.indexOf('Unit Test') > -1);
                    assert.ok(profiles[user.id]);
                    assert.ok(statuses[user.id]);

                    // we don't need to dispatch when the WS closes
                    Actions.close()();
                    done();
                }
            });

            await client.login(user.email, 'password1');
            const post = TestHelper.fakePost();
            post.channel_id = TestHelper.basicChannel.id;
            await Actions.init()(store.dispatch, store.getState);
            client.createPost(TestHelper.basicTeam.id, post);
        });
    }).timeout(2500);

    it('Websocket Handle Post Edited', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const client = TestHelper.createClient();
            const user = await client.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            await Client.addChannelMember(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                user.id);

            await client.login(user.email, 'password1');
            let post = TestHelper.fakePost();
            post.channel_id = TestHelper.basicChannel.id;
            post = await client.createPost(TestHelper.basicTeam.id, post);
            await Actions.init()(store.dispatch, store.getState);

            store.subscribe(async () => {
                const entities = store.getState().entities;
                const {posts, postsByChannel} = entities.posts;

                if (postsByChannel[TestHelper.basicChannel.id]) {
                    const postId = postsByChannel[TestHelper.basicChannel.id][0];
                    assert.ok(posts[postId].message.indexOf('(edited)') > -1);

                    // we don't need to dispatch when the WS closes
                    Actions.close()();
                    done();
                }
            });

            post.message += ' (edited)';
            client.editPost(TestHelper.basicTeam.id, post);
        });
    }).timeout(2500);

    it('Websocket Handle Post Deleted', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            await Actions.init()(store.dispatch, store.getState);
            const client = TestHelper.createClient();
            const user = await client.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            await Client.addChannelMember(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                user.id);

            await client.login(user.email, 'password1');
            let post = TestHelper.fakePost();
            post.channel_id = TestHelper.basicChannel.id;
            post = await client.createPost(TestHelper.basicTeam.id, post);

            store.subscribe(async () => {
                const entities = store.getState().entities;
                const {posts, postsByChannel} = entities.posts;

                if (postsByChannel[TestHelper.basicChannel.id]) {
                    const postId = postsByChannel[TestHelper.basicChannel.id].filter((key) => {
                        return posts[key].state !== undefined; //eslint-disable-line no-undefined
                    })[0];

                    if (posts[postId]) {
                        assert.strictEqual(posts[postId].state, Constants.POST_DELETED);

                        // we don't need to dispatch when the WS closes
                        Actions.close()();
                        done();
                    }
                }
            });

            client.deletePost(TestHelper.basicTeam.id, post.channel_id, post.id);
        });
    }).timeout(2500);

    it('Websocket Handle User Added', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const client = TestHelper.createClient();
            const user = await client.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
            await RootActions.setStoreFromLocalData({
                url: Client.getUrl(),
                token: Client.getToken()
            })(store.dispatch, store.getState);
            await Actions.init()(store.dispatch, store.getState);

            store.subscribe(async () => {
                const entities = store.getState().entities;
                const channels = entities.channels.channels;
                const profilesInChannel = entities.users.profilesInChannel;

                if (channels[TestHelper.basicChannel.id]) {
                    assert.ok(profilesInChannel[TestHelper.basicChannel.id].has(user.id));
                    Actions.close()();
                    done();
                }
            });

            ChannelActions.addChannelMember(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                user.id
            )(store.dispatch, store.getState);
        });
    });

    it('Websocket Handle User Removed', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
            await RootActions.setStoreFromLocalData({
                url: Client.getUrl(),
                token: Client.getToken()
            })(store.dispatch, store.getState);
            await Actions.init()(store.dispatch, store.getState);

            let shouldStop = false;
            store.subscribe(async () => {
                const state = store.getState();
                const entities = state.entities;
                const channels = entities.channels;
                const profilesNotInChannel = entities.users.profilesNotInChannel;

                if (!shouldStop && profilesNotInChannel[TestHelper.basicChannel.id]) {
                    assert.ok(profilesNotInChannel[TestHelper.basicChannel.id].has(TestHelper.basicUser.id));
                    assert.ifError(channels.channels[TestHelper.basicChannel.id]);
                    assert.ifError(channels.myMembers[TestHelper.basicChannel.id]);
                    Actions.close()();
                    shouldStop = true;
                    done();
                }
            });

            ChannelActions.removeChannelMember(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                TestHelper.basicUser.id
            )(store.dispatch, store.getState);
        });
    });

    it('Websocket Handle User Updated', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const client = TestHelper.createClient();
            const user = await client.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            await client.login(user.email, 'password1');
            await Actions.init()(store.dispatch, store.getState);

            let shouldStop = false;
            store.subscribe(async () => {
                const state = store.getState();
                const entities = state.entities;
                const profiles = entities.users.profiles;

                if (!shouldStop && profiles[user.id]) {
                    assert.strictEqual(profiles[user.id].first_name, 'tester4');
                    shouldStop = true;
                    Actions.close()();
                    done();
                }
            });

            client.updateUser({...user, first_name: 'tester4'});
        });
    }).timeout(2500);

    it('Websocket Handle Channel Viewed', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            await Actions.init()(store.dispatch, store.getState);
            await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
            await RootActions.setStoreFromLocalData({
                url: Client.getUrl(),
                token: Client.getToken()
            })(store.dispatch, store.getState);

            store.subscribe(async () => {
                const state = store.getState();
                const entities = state.entities;
                const channels = entities.channels.channels;

                if (channels[TestHelper.basicChannel.id]) {
                    Actions.close()();
                    done();
                }
            });

            Client.updateLastViewedAt(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                false
            );
        });
    });

    it('Websocket Handle Channel Deleted', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            await ChannelActions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);
            await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
            await ChannelActions.selectChannel(TestHelper.basicChannel.id)(store.dispatch, store.getState);
            await Actions.init()(store.dispatch, store.getState);

            let shouldStop = false;
            store.subscribe(async () => {
                const state = store.getState();
                const entities = state.entities;
                const channels = entities.channels;

                if (!shouldStop && Object.keys(channels.channels).length === 2) {
                    assert.ifError(channels.channels[TestHelper.basicChannel.id]);
                    assert.ok(channels.currentId);
                    assert.strictEqual(channels.channels[channels.currentId].name, Constants.DEFAULT_CHANNEL);

                    shouldStop = true;
                    Actions.close()();
                    done();
                }
            });

            Client.deleteChannel(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id
            );
        });
    });

    it('Websocket Handle Direct Channel', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const client = TestHelper.createClient();
            const user = await client.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            await client.login(user.email, 'password1');
            await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
            await Actions.init()(store.dispatch, store.getState);

            store.subscribe(async () => {
                const entities = store.getState().entities;
                const chEntity = entities.channels;
                const myMembers = chEntity.myMembers;
                const channels = chEntity.channels;

                if (Object.keys(myMembers).length && Object.keys(channels).length) {
                    const channelId = Object.keys(channels)[0];
                    assert.strictEqual(myMembers[channelId].user_id, TestHelper.basicUser.id);
                    Actions.close()();
                    done();
                }
            });

            client.createDirectChannel(TestHelper.basicUser.id);
        });
    });

    it('Websocket Handle Preferences Changed', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const client = TestHelper.createClient();
            const user = await client.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );
            await client.login(user.email, 'password1');
            const dm = await client.createDirectChannel(TestHelper.basicUser.id);

            let shouldStop = false;
            store.subscribe(async () => {
                const entities = store.getState().entities;
                const preferences = entities.preferences.myPreferences;
                const {profiles, statuses} = entities.users;

                if (!shouldStop && Object.keys(statuses).length &&
                    Object.keys(profiles).length && Object.keys(preferences).length) {
                    assert.ok(preferences[`${Constants.CATEGORY_DIRECT_CHANNEL_SHOW}--${user.id}`]);
                    assert.ok(profiles[user.id]);
                    assert.ok(statuses[user.id]);

                    // we don't need to dispatch when the WS closes
                    Actions.close()();
                    shouldStop = true;
                    done();
                }
            });

            const post = TestHelper.fakePost();
            post.channel_id = dm.id;
            await Actions.init()(store.dispatch, store.getState);
            client.createPost(TestHelper.basicTeam.id, post);
        });
    }).timeout(2500);
});
