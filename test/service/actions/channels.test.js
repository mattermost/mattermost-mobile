// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'service/actions/channels';
import {getProfilesByIds} from 'service/actions/users';
import Client from 'service/client';
import configureStore from 'app/store';
import {RequestStatus} from 'service/constants';
import TestHelper from 'test/test_helper';

describe('Actions.Channels', () => {
    let store;
    let secondChannel;
    before(async () => {
        await TestHelper.initBasic(Client);
    });

    beforeEach(() => {
        store = configureStore();
    });

    after(async () => {
        await TestHelper.basicClient.logout();
    });

    it('selectChannel', async () => {
        const channelId = TestHelper.generateId();

        await Actions.selectChannel(channelId)(store.dispatch, store.getState);

        const state = store.getState();
        assert.equal(state.entities.channels.currentId, channelId);
    });

    it('createChannel', async () => {
        const channel = {
            team_id: TestHelper.basicTeam.id,
            name: 'redux-test',
            display_name: 'Redux Test',
            purpose: 'This is to test redux',
            header: 'MM with Redux',
            type: 'O'
        };

        await Actions.createChannel(channel, TestHelper.basicUser.id)(store.dispatch, store.getState);
        const createRequest = store.getState().requests.channels.createChannel;
        const membersRequest = store.getState().requests.channels.myMembers;
        if (createRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(createRequest.error));
        } else if (membersRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(membersRequest.error));
        }
        const {channels, myMembers} = store.getState().entities.channels;
        const channelsCount = Object.keys(channels).length;
        const membersCount = Object.keys(myMembers).length;
        assert.ok(channels);
        assert.ok(myMembers);
        assert.ok(channels[Object.keys(myMembers)[0]]);
        assert.ok(myMembers[Object.keys(channels)[0]]);
        assert.equal(myMembers[Object.keys(channels)[0]].user_id, TestHelper.basicUser.id);
        assert.equal(channelsCount, membersCount);
        assert.equal(channelsCount, 1);
        assert.equal(membersCount, 1);
    });

    it('createDirectChannel', async () => {
        const user = await TestHelper.basicClient.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );

        await getProfilesByIds([user.id])(store.dispatch, store.getState);
        await Actions.createDirectChannel(TestHelper.basicTeam.id, TestHelper.basicUser.id, user.id)(store.dispatch, store.getState);

        const createRequest = store.getState().requests.channels.createChannel;
        if (createRequest.status === RequestStatus.FAILURE) {
            throw new Error(createRequest.error);
        }

        const state = store.getState();
        const {channels, myMembers} = state.entities.channels;
        const profiles = state.entities.users.profiles;
        const preferences = state.entities.preferences.myPreferences;
        const channelsCount = Object.keys(channels).length;
        const membersCount = Object.keys(myMembers).length;

        assert.ok(channels, 'channels is empty');
        assert.ok(myMembers, 'members is empty');
        assert.ok(profiles[user.id], 'profiles does not have userId');
        assert.ok(Object.keys(preferences).length, 'preferences is empty');
        assert.ok(channels[Object.keys(myMembers)[0]], 'channels should have the member');
        assert.ok(myMembers[Object.keys(channels)[0]], 'members should belong to channel');
        assert.equal(myMembers[Object.keys(channels)[0]].user_id, TestHelper.basicUser.id);
        assert.equal(channelsCount, membersCount);
        assert.equal(channels[Object.keys(channels)[0]].type, 'D');
        assert.equal(channelsCount, 1);
        assert.equal(membersCount, 1);
    });

    it('updateChannel', async () => {
        const channel = {
            ...TestHelper.basicChannel,
            purpose: 'This is to test redux',
            header: 'MM with Redux'
        };

        await Actions.updateChannel(channel)(store.dispatch, store.getState);

        const updateRequest = store.getState().requests.channels.updateChannel;
        if (updateRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(updateRequest.error));
        }

        const {channels} = store.getState().entities.channels;
        const channelId = Object.keys(channels)[0];
        assert.ok(channelId);
        assert.ok(channels[channelId]);
        assert.strictEqual(channels[channelId].header, 'MM with Redux');
    });

    it('getChannel', async () => {
        await Actions.getChannel(TestHelper.basicTeam.id, TestHelper.basicChannel.id)(store.dispatch, store.getState);

        const channelRequest = store.getState().requests.channels.getChannel;
        if (channelRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(channelRequest.error));
        }

        const {channels, myMembers} = store.getState().entities.channels;
        assert.ok(channels[TestHelper.basicChannel.id]);
        assert.ok(myMembers[TestHelper.basicChannel.id]);
    });

    it('fetchMyChannelsAndMembers', async () => {
        await Actions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);

        const channelsRequest = store.getState().requests.channels.getChannels;
        const membersRequest = store.getState().requests.channels.myMembers;
        if (channelsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(channelsRequest.error));
        } else if (membersRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(membersRequest.error));
        }

        const {channels, myMembers} = store.getState().entities.channels;
        assert.ok(channels);
        assert.ok(myMembers);
        assert.ok(channels[Object.keys(myMembers)[0]]);
        assert.ok(myMembers[Object.keys(channels)[0]]);
        assert.equal(Object.keys(channels).length, Object.keys(myMembers).length);
    });

    it('updateChannelNotifyProps', async () => {
        const notifyProps = {
            mark_unread: 'mention',
            desktop: 'none'
        };

        await Actions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);
        await Actions.updateChannelNotifyProps(
            TestHelper.basicUser.id,
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            notifyProps)(store.dispatch, store.getState);

        const updateRequest = store.getState().requests.channels.updateChannelNotifyProps;
        if (updateRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(updateRequest.error));
        }

        const members = store.getState().entities.channels.myMembers;
        const member = members[TestHelper.basicChannel.id];
        assert.ok(member);
        assert.equal(member.notify_props.mark_unread, 'mention');
        assert.equal(member.notify_props.desktop, 'none');
    });

    it('leaveChannel', async () => {
        await Actions.leaveChannel(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id
        )(store.dispatch, store.getState);

        const leaveRequest = store.getState().requests.channels.leaveChannel;
        if (leaveRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(leaveRequest.error));
        }

        const {channels, myMembers} = store.getState().entities.channels;
        assert.ifError(channels[TestHelper.basicChannel.id]);
        assert.ifError(myMembers[TestHelper.basicChannel.id]);
    });

    it('joinChannel', async () => {
        await Actions.joinChannel(
            TestHelper.basicUser.id,
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id
        )(store.dispatch, store.getState);

        const joinRequest = store.getState().requests.channels.joinChannel;
        if (joinRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(joinRequest.error));
        }

        const {channels, myMembers} = store.getState().entities.channels;
        assert.ok(channels[TestHelper.basicChannel.id]);
        assert.ok(myMembers[TestHelper.basicChannel.id]);
    });

    it('joinChannelByName', async () => {
        const secondClient = TestHelper.createClient();
        const user = await TestHelper.basicClient.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );
        await secondClient.login(user.email, 'password1');

        secondChannel = await secondClient.createChannel(
            TestHelper.fakeChannel(TestHelper.basicTeam.id));

        await Actions.joinChannel(
            TestHelper.basicUser.id,
            TestHelper.basicTeam.id,
            null,
            secondChannel.name
        )(store.dispatch, store.getState);

        const joinRequest = store.getState().requests.channels.joinChannel;
        if (joinRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(joinRequest.error));
        }

        const {channels, myMembers} = store.getState().entities.channels;
        assert.ok(channels[secondChannel.id]);
        assert.ok(myMembers[secondChannel.id]);
    });

    it('deleteChannel', async () => {
        await Actions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);
        await Actions.deleteChannel(
            TestHelper.basicTeam.id,
            secondChannel.id
        )(store.dispatch, store.getState);

        const deleteRequest = store.getState().requests.channels.deleteChannel;
        if (deleteRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(deleteRequest.error));
        }

        const {channels, myMembers} = store.getState().entities.channels;
        assert.ifError(channels[secondChannel.id]);
        assert.ifError(myMembers[secondChannel.id]);
    });

    it('viewChannel', async () => {
        const userChannel = await Client.createChannel(
            TestHelper.fakeChannel(TestHelper.basicTeam.id)
        );
        await Actions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);
        let members = store.getState().entities.channels.myMembers;
        let member = members[TestHelper.basicChannel.id];
        let otherMember = members[userChannel.id];
        assert.ok(member);
        assert.ok(otherMember);
        const lastViewed = member.last_viewed_at;

        await Actions.viewChannel(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            userChannel.id
        )(store.dispatch, store.getState);

        const updateRequest = store.getState().requests.channels.updateLastViewedAt;
        if (updateRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(updateRequest.error));
        }

        members = store.getState().entities.channels.myMembers;
        member = members[TestHelper.basicChannel.id];
        otherMember = members[userChannel.id];
        assert.ok(member.last_viewed_at > lastViewed);
        assert.ok(otherMember.last_viewed_at > lastViewed);
    });

    it('getMoreChannels', async () => {
        const userClient = TestHelper.createClient();
        const user = await TestHelper.basicClient.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );
        await userClient.login(user.email, 'password1');

        const userChannel = await userClient.createChannel(
            TestHelper.fakeChannel(TestHelper.basicTeam.id)
        );

        await Actions.getMoreChannels(TestHelper.basicTeam.id, 0)(store.dispatch, store.getState);

        const moreRequest = store.getState().requests.channels.getMoreChannels;
        if (moreRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(moreRequest.error));
        }

        const {channels, myMembers} = store.getState().entities.channels;
        const channel = channels[userChannel.id];

        assert.ok(channel);
        assert.ifError(myMembers[channel.id]);
    });

    it('getChannelStats', async () => {
        await Actions.getChannelStats(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id
        )(store.dispatch, store.getState);

        const statsRequest = store.getState().requests.channels.getChannelStats;
        if (statsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(statsRequest.error));
        }

        const {stats} = store.getState().entities.channels;
        const stat = stats[TestHelper.basicChannel.id];
        assert.ok(stat);
        assert.equal(stat.member_count, 1);
    });

    it('addChannelMember', async () => {
        const user = await TestHelper.basicClient.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );

        await Actions.addChannelMember(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            user.id
        )(store.dispatch, store.getState);

        const addRequest = store.getState().requests.channels.addChannelMember;
        if (addRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(addRequest.error));
        }

        const {profilesInChannel, profilesNotInChannel} = store.getState().entities.users;
        const channel = profilesInChannel[TestHelper.basicChannel.id];
        const notChannel = profilesNotInChannel[TestHelper.basicChannel.id];
        assert.ok(channel);
        assert.ok(notChannel);
        assert.ok(channel.has(user.id));
        assert.ifError(notChannel.has(user.id));
    });

    it('removeChannelMember', async () => {
        const user = await TestHelper.basicClient.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );

        await Actions.addChannelMember(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            user.id
        )(store.dispatch, store.getState);

        await Actions.removeChannelMember(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            user.id
        )(store.dispatch, store.getState);

        const removeRequest = store.getState().requests.channels.removeChannelMember;
        if (removeRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(removeRequest.error));
        }

        const {profilesInChannel, profilesNotInChannel} = store.getState().entities.users;
        const channel = profilesInChannel[TestHelper.basicChannel.id];
        const notChannel = profilesNotInChannel[TestHelper.basicChannel.id];
        assert.ok(channel);
        assert.ok(notChannel);
        assert.ok(notChannel.has(user.id));
        assert.ifError(channel.has(user.id));
    });
});
