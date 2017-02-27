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
    let store;
    before(async () => {
        store = configureStore();
        await TestHelper.initBasic(Client);
        const webSocketConnector = require('ws');
        return await Actions.init(
            null,
            null,
            webSocketConnector
        )(store.dispatch, store.getState);
    });

    after(async () => {
        Actions.close()();
        await TestHelper.basicClient.logout();
    });

    it('WebSocket Connect', () => {
        const ws = store.getState().requests.general.websocket;
        assert.ok(ws.status === RequestStatus.SUCCESS);
    });

    it('Websocket Handle New Post', async () => {
        const client = TestHelper.createClient();
        const user = await client.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );
        await client.login(user.email, 'password1');

        await Client.addChannelMember(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            user.id);

        const post = {...TestHelper.fakePost(), channel_id: TestHelper.basicChannel.id};
        await client.createPost(TestHelper.basicTeam.id, post);

        const entities = store.getState().entities;
        const {posts, postsByChannel} = entities.posts;
        const channelId = TestHelper.basicChannel.id;
        const postId = postsByChannel[channelId][0];

        assert.ok(posts[postId].message.indexOf('Unit Test') > -1);
    });

    it('Websocket Handle Post Edited', async () => {
        let post = {...TestHelper.fakePost(), channel_id: TestHelper.basicChannel.id};
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

        post = await client.createPost(TestHelper.basicTeam.id, post);
        post.message += ' (edited)';

        await client.editPost(TestHelper.basicTeam.id, post);

        store.subscribe(async () => {
            const entities = store.getState().entities;
            const {posts} = entities.posts;
            assert.ok(posts[post.id].message.indexOf('(edited)') > -1);
        });
    });

    it('Websocket Handle Post Deleted', async () => {
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

        await client.deletePost(TestHelper.basicTeam.id, post.channel_id, post.id);

        store.subscribe(async () => {
            const entities = store.getState().entities;
            const {posts} = entities.posts;
            assert.strictEqual(posts[post.id].state, Constants.POST_DELETED);
        });
    });

    it('WebSocket Leave Team', async () => {
        const client = TestHelper.createClient();
        const user = await client.createUser(TestHelper.fakeUser());
        await client.login(user.email, 'password1');
        const team = await client.createTeam(TestHelper.fakeTeam());
        const channel = await client.createChannel(TestHelper.fakeChannel(team.id));
        await client.addUserToTeam(team.id, TestHelper.basicUser.id);
        await client.addChannelMember(team.id, channel.id, TestHelper.basicUser.id);

        await RootActions.setStoreFromLocalData({
            url: Client.getUrl(),
            token: Client.getToken()
        })(store.dispatch, store.getState);
        await TeamActions.selectTeam(team)(store.dispatch, store.getState);
        await ChannelActions.selectChannel(channel.id)(store.dispatch, store.getState);
        await client.removeUserFromTeam(team.id, TestHelper.basicUser.id);

        const {myMembers} = store.getState().entities.teams;
        assert.ifError(myMembers[team.id]);
    });

    it('Websocket Handle User Added', async () => {
        const client = TestHelper.createClient();
        const user = await client.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );

        await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);

        await ChannelActions.addChannelMember(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            user.id
        )(store.dispatch, store.getState);

        const entities = store.getState().entities;
        const profilesInChannel = entities.users.profilesInChannel;
        assert.ok(profilesInChannel[TestHelper.basicChannel.id].has(user.id));
    });

    it('Websocket Handle User Removed', async () => {
        await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);

        const user = await TestHelper.basicClient.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );

        await ChannelActions.addChannelMember(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            user.id
        )(store.dispatch, store.getState);

        await ChannelActions.removeChannelMember(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            user.id
        )(store.dispatch, store.getState);

        const state = store.getState();
        const entities = state.entities;
        const profilesNotInChannel = entities.users.profilesNotInChannel;

        assert.ok(profilesNotInChannel[TestHelper.basicChannel.id].has(user.id));
    });

    it('Websocket Handle User Updated', async () => {
        const client = TestHelper.createClient();
        const user = await client.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );

        await client.login(user.email, 'password1');
        await client.updateUser({...user, first_name: 'tester4'});

        store.subscribe(() => {
            const state = store.getState();
            const entities = state.entities;
            const profiles = entities.users.profiles;

            assert.strictEqual(profiles[user.id].first_name, 'tester4');
        });
    });

    it('Websocket Handle Channel Created', (done) => {
        async function test() {
            await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
            const channel = await Client.createChannel(TestHelper.fakeChannel(TestHelper.basicTeam.id));

            setTimeout(() => {
                const state = store.getState();
                const entities = state.entities;
                const {channels, myMembers} = entities.channels;

                assert.ok(channels[channel.id]);
                assert.ok(myMembers[channel.id]);
                done();
            }, 1000);
        }

        test();
    });

    it('Websocket Handle Channel Deleted', (done) => {
        async function test() {
            await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
            await ChannelActions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);
            await ChannelActions.selectChannel(TestHelper.basicChannel.id)(store.dispatch, store.getState);
            await Client.deleteChannel(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id
            );

            setTimeout(() => {
                const state = store.getState();
                const entities = state.entities;
                const {channels, currentId} = entities.channels;

                assert.ok(channels[currentId].name === Constants.DEFAULT_CHANNEL);
                done();
            }, 500);
        }

        test();
    });

    it('Websocket Handle Direct Channel', (done) => {
        async function test() {
            const client = TestHelper.createClient();
            const user = await client.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            await client.login(user.email, 'password1');
            await TeamActions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);

            setTimeout(() => {
                const entities = store.getState().entities;
                const {channels} = entities.channels;
                assert.ok(Object.keys(channels).length);
                done();
            }, 500);

            await client.createDirectChannel(TestHelper.basicTeam.id, TestHelper.basicUser.id);
        }

        test();
    });
});
