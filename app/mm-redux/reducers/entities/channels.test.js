// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelTypes} from '@mm-redux/action_types';
import deepFreeze from '@mm-redux/utils/deep_freeze';

import channelsReducer, * as Reducers from './channels';

import {Permissions} from '../../constants';

describe('channels', () => {
    describe('RECEIVED_CHANNEL_DELETED', () => {
        test('should mark channel as deleted', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                    },
                    channel2: {
                        id: 'channel2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.RECEIVED_CHANNEL_DELETED,
                data: {
                    id: 'channel1',
                    deleteAt: 1000,
                },
            });

            expect(nextState).not.toBe(state);
            expect(nextState.channels.channel1).toEqual({
                id: 'channel1',
                delete_at: 1000,
            });
            expect(nextState.channels.channel2).toBe(state.channels.channel2);
        });

        test('should do nothing for a channel that is not loaded', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                    },
                    channel2: {
                        id: 'channel2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.RECEIVED_CHANNEL_DELETED,
                data: {
                    id: 'channel3',
                    deleteAt: 1000,
                },
            });

            expect(nextState).toBe(state);
        });
    });

    describe('RECEIVED_CHANNEL_UNARCHIVED', () => {
        test('should mark channel as active', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        delete_at: 1000,
                    },
                    channel2: {
                        id: 'channel2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.RECEIVED_CHANNEL_UNARCHIVED,
                data: {
                    id: 'channel1',
                },
            });

            expect(nextState).not.toBe(state);
            expect(nextState.channels.channel1).toEqual({
                id: 'channel1',
                delete_at: 0,
            });
            expect(nextState.channels.channel2).toBe(state.channels.channel2);
        });

        test('should do nothing for a channel that is not loaded', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                    },
                    channel2: {
                        id: 'channel2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.RECEIVED_CHANNEL_UNARCHIVED,
                data: {
                    id: 'channel3',
                },
            });

            expect(nextState).toBe(state);
        });
    });

    describe('UPDATE_CHANNEL_HEADER', () => {
        test('should update channel header', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        header: 'old',
                    },
                    channel2: {
                        id: 'channel2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.UPDATE_CHANNEL_HEADER,
                data: {
                    channelId: 'channel1',
                    header: 'new',
                },
            });

            expect(nextState).not.toBe(state);
            expect(nextState.channels.channel1).toEqual({
                id: 'channel1',
                header: 'new',
            });
            expect(nextState.channels.channel2).toBe(state.channels.channel2);
        });

        test('should do nothing for a channel that is not loaded', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        header: 'old',
                    },
                    channel2: {
                        id: 'channel2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.UPDATE_CHANNEL_HEADER,
                data: {
                    channelId: 'channel3',
                    header: 'new',
                },
            });

            expect(nextState).toBe(state);
        });
    });

    describe('UPDATE_CHANNEL_PURPOSE', () => {
        test('should update channel purpose', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        purpose: 'old',
                    },
                    channel2: {
                        id: 'channel2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.UPDATE_CHANNEL_PURPOSE,
                data: {
                    channelId: 'channel1',
                    purpose: 'new',
                },
            });

            expect(nextState).not.toBe(state);
            expect(nextState.channels.channel1).toEqual({
                id: 'channel1',
                purpose: 'new',
            });
            expect(nextState.channels.channel2).toBe(state.channels.channel2);
        });

        test('should do nothing for a channel that is not loaded', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        header: 'old',
                    },
                    channel2: {
                        id: 'channel2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.UPDATE_CHANNEL_PURPOSE,
                data: {
                    channelId: 'channel3',
                    purpose: 'new',
                },
            });

            expect(nextState).toBe(state);
        });
    });

    describe('REMOVE_MEMBER_FROM_CHANNEL', () => {
        test('should remove the channel member', () => {
            const state = deepFreeze({
                channels: {},
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {
                    channel1: {
                        memberId1: 'member-data-1',
                    },
                    channel2: {
                        memberId2: 'member-data-2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.REMOVE_MEMBER_FROM_CHANNEL,
                data: {
                    id: 'channel2',
                    user_id: 'memberId2',
                },
            });

            expect(nextState.membersInChannel.channel2).toEqual({});
            expect(nextState.membersInChannel.channel1).toEqual(state.membersInChannel.channel1);
        });

        test('should work when channel member doesn\'t exist', () => {
            const state = deepFreeze({
                channels: {},
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {
                    channel1: {
                        memberId1: 'member-data-1',
                    },
                    channel2: {
                        memberId2: 'member-data-2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.REMOVE_MEMBER_FROM_CHANNEL,
                data: {
                    id: 'channel2',
                    user_id: 'test',
                },
            });

            expect(nextState).toEqual(state);
        });

        test('should work when channel doesn\'t exist', () => {
            const state = deepFreeze({
                channels: {},
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                manuallyUnread: {},
                membersInChannel: {
                    channel1: {
                        memberId1: 'member-data-1',
                    },
                    channel2: {
                        memberId2: 'member-data-2',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.REMOVE_MEMBER_FROM_CHANNEL,
                data: {
                    id: 'channel3',
                    user_id: 'memberId2',
                },
            });

            expect(nextState).toEqual(state);
        });
    });
    describe('MANUALLY_UNREAD', () => {
        test('should mark channel as manually unread', () => {
            const state = deepFreeze({
                channel1: false,
            });
            const nextState = Reducers.manuallyUnread(state, {
                type: ChannelTypes.POST_UNREAD_SUCCESS,
                data: {channelId: 'channel1'},
            });
            expect(nextState.channel1).toBe(true);
        });
        test('should mark channel as manually unread even if undefined', () => {
            const state = deepFreeze({
            });
            const nextState = Reducers.manuallyUnread(state, {
                type: ChannelTypes.POST_UNREAD_SUCCESS,
                data: {channelId: 'channel1'},
            });
            expect(nextState.channel1).toBe(true);
        });
        test('should remove channel as manually unread', () => {
            const state = deepFreeze({
                channel1: true,
            });
            const nextState = Reducers.manuallyUnread(state, {
                type: ChannelTypes.REMOVE_MANUALLY_UNREAD,
                data: {channelId: 'channel1'},
            });
            expect(nextState.channel1).toBe(undefined);
        });
        test('shouldn\'t do nothing if channel was undefined', () => {
            const state = deepFreeze({
            });
            const nextState = Reducers.manuallyUnread(state, {
                type: ChannelTypes.REMOVE_MANUALLY_UNREAD,
                data: {channelId: 'channel1'},
            });
            expect(nextState.channel1).toBe(undefined);
        });
    });
    describe('RECEIVED_CHANNELS', () => {
        test('should not remove current channel', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        team_id: 'team',
                    },
                    channel2: {
                        id: 'channel2',
                        team_id: 'team',
                    },
                    channel3: {
                        id: 'channel3',
                        team_id: 'team',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.RECEIVED_CHANNELS,
                currentChannelId: 'channel3',
                teamId: 'team',
                data: [{
                    id: 'channel1',
                    team_id: 'team',
                }],
            });

            expect(nextState).not.toBe(state);
            expect(nextState.channels.channel1).toEqual({
                id: 'channel1',
                team_id: 'team',
            });
            expect(nextState.channels.channel2).toEqual({
                id: 'channel2',
                team_id: 'team',
            });
            expect(nextState.channels.channel3).toEqual({
                id: 'channel3',
                team_id: 'team',
            });
        });
    });

    describe('RECEIVED_CHANNEL_MODERATIONS', () => {
        test('Should add new channel moderations', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        team_id: 'team',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.RECEIVED_CHANNEL_MODERATIONS,
                sync: true,
                currentChannelId: 'channel1',
                teamId: 'team',
                data: {
                    channelId: 'channel1',
                    moderations: [
                        {
                            name: Permissions.CHANNEL_MODERATED_PERMISSIONS.CREATE_POST,
                            roles: {
                                members: true,
                            },
                        },
                    ],
                },
            });

            expect(nextState.channelModerations.channel1[0].name).toEqual(Permissions.CHANNEL_MODERATED_PERMISSIONS.CREATE_POST);
            expect(nextState.channelModerations.channel1[0].roles.members).toEqual(true);
        });
        test('Should replace existing channel moderations', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        team_id: 'team',
                    },
                },
                channelModerations: {
                    channel1: [{
                        name: Permissions.CHANNEL_MODERATED_PERMISSIONS.CREATE_POST,
                        roles: {
                            members: true,
                        },
                    }],
                },
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.RECEIVED_CHANNEL_MODERATIONS,
                sync: true,
                currentChannelId: 'channel1',
                teamId: 'team',
                data: {
                    channelId: 'channel1',
                    moderations: [
                        {
                            name: Permissions.CHANNEL_MODERATED_PERMISSIONS.CREATE_REACTIONS,
                            roles: {
                                members: true,
                                guests: false,
                            },
                        },
                    ],
                },
            });

            expect(nextState.channelModerations.channel1[0].name).toEqual(Permissions.CHANNEL_MODERATED_PERMISSIONS.CREATE_REACTIONS);
            expect(nextState.channelModerations.channel1[0].roles.members).toEqual(true);
            expect(nextState.channelModerations.channel1[0].roles.guests).toEqual(false);
        });
    });

    describe('RECEIVED_CHANNEL_MEMBER_COUNTS_BY_GROUP', () => {
        test('Should add new channel member counts', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        team_id: 'team',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {},
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.RECEIVED_CHANNEL_MEMBER_COUNTS_BY_GROUP,
                sync: true,
                currentChannelId: 'channel1',
                teamId: 'team',
                data: {
                    channelId: 'channel1',
                    memberCounts: [
                        {
                            group_id: 'group-1',
                            channel_member_count: 1,
                            channel_member_timezones_count: 1,
                        },
                        {
                            group_id: 'group-2',
                            channel_member_count: 999,
                            channel_member_timezones_count: 131,
                        },
                    ],
                },
            });

            expect(nextState.channelMemberCountsByGroup.channel1['group-1'].channel_member_count).toEqual(1);
            expect(nextState.channelMemberCountsByGroup.channel1['group-1'].channel_member_timezones_count).toEqual(1);

            expect(nextState.channelMemberCountsByGroup.channel1['group-2'].channel_member_count).toEqual(999);
            expect(nextState.channelMemberCountsByGroup.channel1['group-2'].channel_member_timezones_count).toEqual(131);
        });

        test('Should replace existing channel member counts', () => {
            const state = deepFreeze({
                channelsInTeam: {},
                currentChannelId: '',
                groupsAssociatedToChannel: {},
                myMembers: {},
                stats: {},
                totalCount: 0,
                membersInChannel: {},
                channels: {
                    channel1: {
                        id: 'channel1',
                        team_id: 'team',
                    },
                },
                channelModerations: {},
                channelMemberCountsByGroup: {
                    'group-1': {
                        group_id: 'group-1',
                        channel_member_count: 1,
                        channel_member_timezones_count: 1,
                    },
                    'group-2': {
                        group_id: 'group-2',
                        channel_member_count: 999,
                        channel_member_timezones_count: 131,
                    },
                },
            });

            const nextState = channelsReducer(state, {
                type: ChannelTypes.RECEIVED_CHANNEL_MEMBER_COUNTS_BY_GROUP,
                sync: true,
                currentChannelId: 'channel1',
                teamId: 'team',
                data: {
                    channelId: 'channel1',
                    memberCounts: [
                        {
                            group_id: 'group-1',
                            channel_member_count: 5,
                            channel_member_timezones_count: 2,
                        },
                        {
                            group_id: 'group-2',
                            channel_member_count: 1002,
                            channel_member_timezones_count: 133,
                        },
                        {
                            group_id: 'group-3',
                            channel_member_count: 12,
                            channel_member_timezones_count: 13,
                        },
                    ],
                },
            });

            expect(nextState.channelMemberCountsByGroup.channel1['group-1'].channel_member_count).toEqual(5);
            expect(nextState.channelMemberCountsByGroup.channel1['group-1'].channel_member_timezones_count).toEqual(2);

            expect(nextState.channelMemberCountsByGroup.channel1['group-2'].channel_member_count).toEqual(1002);
            expect(nextState.channelMemberCountsByGroup.channel1['group-2'].channel_member_timezones_count).toEqual(133);

            expect(nextState.channelMemberCountsByGroup.channel1['group-3'].channel_member_count).toEqual(12);
            expect(nextState.channelMemberCountsByGroup.channel1['group-3'].channel_member_timezones_count).toEqual(13);
        });
    });
});
