// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelTypes, UserTypes} from '@mm-redux/action_types';
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
});
