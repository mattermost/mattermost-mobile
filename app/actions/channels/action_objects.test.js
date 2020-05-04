// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelTypes} from '@mm-redux/action_types';

import TestHelper from 'test/test_helper';
import * as Actions from './action_objects';

describe('Actions.Channels.ActionObjects', () => {
    test('createChannelRequest', () => {
        const expectedObject = {
            type: ChannelTypes.CREATE_CHANNEL_REQUEST,
        };

        const actionObject = Actions.createChannelRequest();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('createChannelSuccess', () => {
        const expectedObject = {
            type: ChannelTypes.CREATE_CHANNEL_SUCCESS,
        };

        const actionObject = Actions.createChannelSuccess();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('createChannelFailure', () => {
        const error = new Error();

        const expectedObject = {
            type: ChannelTypes.CREATE_CHANNEL_FAILURE,
            error,
        };

        const actionObject = Actions.createChannelFailure(error);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('updateChannelRequest', () => {
        const expectedObject = {
            type: ChannelTypes.UPDATE_CHANNEL_REQUEST,
        };

        const actionObject = Actions.updateChannelRequest();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('updateChannelSuccess', () => {
        const expectedObject = {
            type: ChannelTypes.UPDATE_CHANNEL_SUCCESS,
        };

        const actionObject = Actions.updateChannelSuccess();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('updateChannelFailure', () => {
        const error = new Error();

        const expectedObject = {
            type: ChannelTypes.UPDATE_CHANNEL_FAILURE,
            error,
        };

        const actionObject = Actions.updateChannelFailure(error);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('getChannelsRequest', () => {
        const expectedObject = {
            type: ChannelTypes.GET_CHANNELS_REQUEST,
        };

        const actionObject = Actions.getChannelsRequest();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('getChannelsSuccess', () => {
        const expectedObject = {
            type: ChannelTypes.GET_CHANNELS_SUCCESS,
        };

        const actionObject = Actions.getChannelsSuccess();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('getChannelsFailure', () => {
        const error = new Error();

        const expectedObject = {
            type: ChannelTypes.GET_CHANNELS_FAILURE,
            error,
        };

        const actionObject = Actions.getChannelsFailure(error);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('getAllChannelsRequest', () => {
        const expectedObject = {
            type: ChannelTypes.GET_ALL_CHANNELS_REQUEST,
        };

        const actionObject = Actions.getAllChannelsRequest();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('getAllChannelsSuccess', () => {
        const expectedObject = {
            type: ChannelTypes.GET_ALL_CHANNELS_SUCCESS,
        };

        const actionObject = Actions.getAllChannelsSuccess();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('getAllChannelsFailure', () => {
        const error = new Error();

        const expectedObject = {
            type: ChannelTypes.GET_ALL_CHANNELS_FAILURE,
            error,
        };

        const actionObject = Actions.getAllChannelsFailure(error);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('deleteChannelSuccess', () => {
        const channelId = 'channel-id';
        const viewArchivedChannels = true;

        const expectedObject = {
            type: ChannelTypes.DELETE_CHANNEL_SUCCESS,
            data: {
                id: channelId,
                viewArchivedChannels,
            },
        };

        const actionObject = Actions.deleteChannelSuccess(channelId, viewArchivedChannels);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('selectChannel', () => {
        const channelId = 'channel-id';
        const extra = {};

        const expectedObject1 = {
            type: ChannelTypes.SELECT_CHANNEL,
            data: channelId,
            extra,
        };

        const actionObject1 = Actions.selectChannel(channelId, extra);
        expect(actionObject1).toStrictEqual(expectedObject1);

        const expectedObject2 = {
            type: ChannelTypes.SELECT_CHANNEL,
            data: channelId,
            extra: undefined,
        };

        const actionObject2 = Actions.selectChannel(channelId);
        expect(actionObject2).toStrictEqual(expectedObject2);
    });

    test('receivedChannel(channel: Channel)', () => {
        const channel = TestHelper.fakeChannel();

        const expectedObject = {
            type: ChannelTypes.RECEIVED_CHANNEL,
            data: channel,
        };

        const actionObject = Actions.receivedChannel(channel);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedChannels', () => {
        const teamId = 'team-id';
        const channels = [
            TestHelper.fakeChannel(),
            TestHelper.fakeChannel(),
        ];

        const expectedObject = {
            type: ChannelTypes.RECEIVED_CHANNELS,
            teamId,
            data: channels,
        };

        const actionObject = Actions.receivedChannels(teamId, channels);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedAllChannels', () => {
        const channels = [
            TestHelper.fakeChannel(),
            TestHelper.fakeChannel(),
        ];

        const expectedObject = {
            type: ChannelTypes.RECEIVED_ALL_CHANNELS,
            data: channels,
        };

        const actionObject = Actions.receivedAllChannels(channels);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedUnarchivedChannel', () => {
        const channelId = 'channel-id';

        const expectedObject = {
            type: ChannelTypes.RECEIVED_CHANNEL_UNARCHIVED,
            data: {
                id: channelId,
            },
        };

        const actionObject = Actions.receivedUnarchivedChannel(channelId);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedDeletedChannel', () => {
        const channelId = 'channel-id';
        const deleteAt = Date.now();
        const viewArchivedChannels = false;

        const expectedObject = {
            type: ChannelTypes.RECEIVED_CHANNEL_DELETED,
            data: {
                id: channelId,
                deleteAt,
                viewArchivedChannels,
            },
        };

        const actionObject = Actions.receivedDeletedChannel(channelId, deleteAt, viewArchivedChannels);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedTotalChannelCount', () => {
        const channelCount = 1;
    
        const expectedObject = {
            type: ChannelTypes.RECEIVED_TOTAL_CHANNEL_COUNT,
            data: channelCount,
        };

        const actionObject = Actions.receivedTotalChannelCount(channelCount);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedMyChannelMember', () => {
        const member = TestHelper.fakeChannelMember();

        const expectedObject = {
            type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER,
            data: member,
        };

        const actionObject = Actions.receivedMyChannelMember(member);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedMyChannelMembers', () => {
        const channelMembers = [
            TestHelper.fakeChannelMember(),
            TestHelper.fakeChannelMember(),
        ];
        const removeChannelIds = ['channel-1', 'channel-2'];
        const currentUserId = 'user-id';

        const expectedObject = {
            type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS,
            data: channelMembers,
            removeChannelIds,
            currentUserId,
        };

        const actionObject = Actions.receivedMyChannelMembers(channelMembers, removeChannelIds, currentUserId);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedMyChannelsWithMembers', () => {
        const channels = [
            TestHelper.fakeChannel(),
            TestHelper.fakeChannel(),
        ];
        const channelMembers = [
            TestHelper.fakeChannelMember(),
            TestHelper.fakeChannelMember(),
        ];

        const expectedObject = {
            type: ChannelTypes.RECEIVED_MY_CHANNELS_WITH_MEMBERS,
            data: {
                channels,
                channelMembers,
            },
        };

        const actionObject = Actions.receivedMyChannelsWithMembers(channels, channelMembers);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedChannelMember', () => {
        const channelMember = TestHelper.fakeChannelMember();

        const expectedObject = {
            type: ChannelTypes.RECEIVED_CHANNEL_MEMBER,
            data: channelMember,
        };

        const actionObject = Actions.receivedChannelMember(channelMember);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedChannelMembers', () => {
        const channelMembers = [
            TestHelper.fakeChannelMember(),
            TestHelper.fakeChannelMember(),
        ];

        const expectedObject = {
            type: ChannelTypes.RECEIVED_CHANNEL_MEMBERS,
            data: channelMembers,
        };

        const actionObject = Actions.receivedChannelMembers(channelMembers);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedChannelProps', () => {
        const channelId = 'channel-id';
        const notifyProps = {};

        const expectedObject = {
            type: ChannelTypes.RECEIVED_CHANNEL_PROPS,
            data: {
                channel_id: channelId,
                notifyProps,
            },
        };

        const actionObject = Actions.receivedChannelProps(channelId, notifyProps);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('receivedChannelStats', () => {
        const stats = {
            channel_id: 'channel-id',
            member_count: 1,
            pinnedpost_count: 2,
        };

        const expectedObject = {
            type: ChannelTypes.RECEIVED_CHANNEL_STATS,
            data: stats,
        };

        const actionObject = Actions.receivedChannelStats(stats);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('channelsRequest', () => {
        const expectedObject = {
            type: ChannelTypes.CHANNELS_REQUEST,
        };

        const actionObject = Actions.channelsRequest();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('channelsSuccess', () => {
        const expectedObject = {
            type: ChannelTypes.CHANNELS_SUCCESS,
        };

        const actionObject = Actions.channelsSuccess();
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('channelsFailure', () => {
        const error = new Error();

        const expectedObject = {
            type: ChannelTypes.CHANNELS_FAILURE,
            error,
        };

        const actionObject = Actions.channelsFailure(error);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('leaveChannel', () => {
        const channel = TestHelper.fakeChannel();
        const userId = 'user-id';

        const expectedObject = {
            type: ChannelTypes.LEAVE_CHANNEL,
            data: {
                id: channel.id,
                user_id: userId,
                team_id: channel.team_id,
                type: channel.type,
            },
        };

        const actionObject = Actions.leaveChannel(channel, userId);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('addManuallyUnread', () => {
        const channelId = 'channel-id';

        const expectedObject = {
            type: ChannelTypes.ADD_MANUALLY_UNREAD,
            data: {
                channelId,
            },
        };

        const actionObject = Actions.addManuallyUnread(channelId);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('removeManuallyUnread', () => {
        const channelId = 'channel-id';

        const expectedObject = {
            type: ChannelTypes.REMOVE_MANUALLY_UNREAD,
            data: {
                channelId,
            },
        };

        const actionObject = Actions.removeManuallyUnread(channelId);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('addChannelMemberSuccess', () => {
        const channelId = 'channel-id';

        const expectedObject = {
            type: ChannelTypes.ADD_CHANNEL_MEMBER_SUCCESS,
            id: channelId,
        };

        const actionObject = Actions.addChannelMemberSuccess(channelId);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('removeChannelMemberSuccess', () => {
        const channelId = 'channel-id';

        const expectedObject = {
            type: ChannelTypes.REMOVE_CHANNEL_MEMBER_SUCCESS,
            id: channelId,
        };

        const actionObject = Actions.removeChannelMemberSuccess(channelId);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('incrementTotalMessageCount', () => {
        const channelId = 'channel-id';
        const amount = 1;

        const expectedObject = {
            type: ChannelTypes.INCREMENT_TOTAL_MSG_COUNT,
            data: {
                channelId,
                amount,
            },
        };

        const actionObject = Actions.incrementTotalMessageCount(channelId, amount);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('incrementUnreadMessageCount', () => {
        const channel = TestHelper.fakeChannel();
        const amount = 1;
        const onlyMentions = true;

        const expectedObject = {
            type: ChannelTypes.INCREMENT_UNREAD_MSG_COUNT,
            data: {
                channel,
                amount,
                onlyMentions,
            },
        };

        const actionObject = Actions.incrementUnreadMessageCount(channel, amount, onlyMentions);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('incrementUnreadMentionCount', () => {
        const channel = TestHelper.fakeChannel();
        const amount = 1;

        const expectedObject = {
            type: ChannelTypes.INCREMENT_UNREAD_MENTION_COUNT,
            data: {
                channel,
                amount,
            },
        };

        const actionObject = Actions.incrementUnreadMentionCount(channel, amount);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('decrementUnreadMessageCount', () => {
        const channel = TestHelper.fakeChannel();
        const amount = 1;

        const expectedObject = {
            type: ChannelTypes.DECREMENT_UNREAD_MSG_COUNT,
            data: {
                channel,
                amount,
            },
        };

        const actionObject = Actions.decrementUnreadMessageCount(channel, amount);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('decrementUnreadMentionCount', () => {
        const channel = TestHelper.fakeChannel();
        const amount = 1;

        const expectedObject = {
            type: ChannelTypes.DECREMENT_UNREAD_MENTION_COUNT,
            data: {
                channel,
                amount,
            },
        };

        const actionObject = Actions.decrementUnreadMentionCount(channel, amount);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('incrementPinnedPostCount', () => {
        const channelId = 'channel-id';

        const expectedObject = {
            type: ChannelTypes.INCREMENT_PINNED_POST_COUNT,
            id: channelId,
        };

        const actionObject = Actions.incrementPinnedPostCount(channelId);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('decrementPinnedPostCount', () => {
        const channelId = 'channel-id';

        const expectedObject = {
            type: ChannelTypes.DECREMENT_PINNED_POST_COUNT,
            id: channelId,
        };

        const actionObject = Actions.decrementPinnedPostCount(channelId);
        expect(actionObject).toStrictEqual(expectedObject);
    });

    test('postUnreadSuccess', () => {
        const data = {};

        const expectedObject = {
            type: ChannelTypes.POST_UNREAD_SUCCESS,
            data,
        };

        const actionObject = Actions.postUnreadSuccess(data);
        expect(actionObject).toStrictEqual(expectedObject);
    });
});