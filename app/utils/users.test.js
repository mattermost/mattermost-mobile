// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from 'test/test_helper';

import * as ChannelUtils from '@utils/channels';

import {canSelectChannel} from './users';

describe('Selectors.Channel', () => {
    describe('canSelectChannel', () => {
        ChannelUtils.isArchivedChannel = jest.fn();
        ChannelUtils.isDirectChannel = jest.fn();
        ChannelUtils.isDirectChannelVisible = jest.fn();
        ChannelUtils.isGroupChannel = jest.fn();
        ChannelUtils.isGroupChannelVisible = jest.fn();

        const generateChannelAndState = () => {
            const channel = TestHelper.fakeChannel();
            const currentUser = TestHelper.fakeUser();

            const state = {
                entities: {
                    users: {
                        currentUserId: currentUser.id,
                    },
                    preferences: {
                        myPreferences: {},
                    },
                    general: {
                        config: {},
                    },
                    channels: {
                        myMembers: {
                            [channel.id]: {},
                        },
                    },
                },
            };

            return {channel, state};
        };

        afterEach(() => {
            ChannelUtils.isArchivedChannel.mockReset();
            ChannelUtils.isDirectChannel.mockReset();
            ChannelUtils.isDirectChannelVisible.mockReset();
            ChannelUtils.isGroupChannel.mockReset();
            ChannelUtils.isGroupChannelVisible.mockReset();
        });

        it('should return true if channel not archived, not DM, not GM and user is member', () => {
            ChannelUtils.isArchivedChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(false);
            ChannelUtils.isGroupChannel.mockReturnValueOnce(false);

            const {channel, state} = generateChannelAndState();

            expect(canSelectChannel(state, channel)).toBe(true);
        });

        it('should return false if channel not archived, not DM, not GM and user is not member', () => {
            ChannelUtils.isArchivedChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(false);
            ChannelUtils.isGroupChannel.mockReturnValueOnce(false);

            const {channel, state} = generateChannelAndState();
            const newState = {
                ...state,
                entities: {
                    ...state.entities,
                    channels: {
                        myMembers: {},
                    },
                },
            };

            expect(canSelectChannel(newState, channel)).toBe(false);
        });

        it('should return true if user is a member of visible GM channel', () => {
            ChannelUtils.isArchivedChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(false);
            ChannelUtils.isGroupChannel.mockReturnValueOnce(true);
            ChannelUtils.isGroupChannelVisible.mockReturnValueOnce(true);

            const {channel, state} = generateChannelAndState();

            expect(canSelectChannel(state, channel)).toBe(true);
        });

        it('should return false if user is a member of GM channel not visible', () => {
            ChannelUtils.isArchivedChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(false);
            ChannelUtils.isGroupChannel.mockReturnValueOnce(true);
            ChannelUtils.isGroupChannelVisible.mockReturnValueOnce(false);

            const {channel, state} = generateChannelAndState();

            expect(canSelectChannel(state, channel)).toBe(false);
        });

        it('should return true if user is a member of visible DM channel', () => {
            ChannelUtils.isArchivedChannel.mockReturnValueOnce(false);
            ChannelUtils.isGroupChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(true);
            ChannelUtils.isDirectChannelVisible.mockReturnValueOnce(true);

            const {channel, state} = generateChannelAndState();

            expect(canSelectChannel(state, channel)).toBe(true);
        });

        it('should return false if user is a member of DM channel not visible', () => {
            ChannelUtils.isArchivedChannel.mockReturnValueOnce(false);
            ChannelUtils.isGroupChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(true);
            ChannelUtils.isDirectChannelVisible.mockReturnValueOnce(false);

            const {channel, state} = generateChannelAndState();

            expect(canSelectChannel(state, channel)).toBe(false);
        });

        it('should return true if user is a member of visible archived channel', () => {
            ChannelUtils.isGroupChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(false);
            ChannelUtils.isArchivedChannel.mockReturnValueOnce(true);

            const {channel, state} = generateChannelAndState();
            const newState = {
                entities: {
                    ...state.entities,
                    general: {
                        config: {
                            ExperimentalViewArchivedChannels: 'true',
                        },
                    },
                },
            };

            expect(canSelectChannel(newState, channel)).toBe(true);
        });

        it('should return false if user is a member of archived channel not visible', () => {
            ChannelUtils.isGroupChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(false);
            ChannelUtils.isArchivedChannel.mockReturnValueOnce(true);

            const {channel, state} = generateChannelAndState();
            const newState = {
                entities: {
                    ...state.entities,
                    general: {
                        config: {
                            ExperimentalViewArchivedChannels: 'false',
                        },
                    },
                },
            };

            expect(canSelectChannel(newState, channel)).toBe(false);
        });
    });
});