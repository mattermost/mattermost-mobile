// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {General, Preferences} from '@mm-redux/constants';

import {Client4} from '@mm-redux/client';

import * as CommonSelectors from '@mm-redux/selectors/entities/common'
import * as TeamSelectors from '@mm-redux/selectors/entities/teams';
import * as ChannelSelectors from '@mm-redux/selectors/entities/channels';

import * as ChannelRequestorActions from '@actions/channels/requestor_actions';
import * as ChannelActionObjects from '@actions/channels/action_objects';
import * as ChannelActionHelpers from '@actions/helpers/channels';
import * as PreferenceActions from '@mm-redux/actions/preferences';
import * as RoleActions from '@mm-redux/actions/roles';

import * as PrefrenceUtils from '@utils/preferences';

import TestHelper from 'test/test_helper';

import * as Actions from './high_order_actions';

describe('Actions.Channels.HighOrderActions', () => {
    let store;
    const createMockStore = configureStore([thunk]);

    beforeEach(() => {
        store = createMockStore({});
    });

    describe('getChannelsByTeamName', () => {
        const team = TestHelper.fakeTeam();

        beforeEach(() => {
            jest.restoreAllMocks();

            ChannelRequestorActions.getMyChannelsAndMembersForTeam = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('get-channels-and-members'));;

            TeamSelectors.getTeamByName = jest.fn();
            TeamSelectors.getCurrentTeamId = jest.fn();
        });

        it('returns error if no team found', async () => {
            TeamSelectors.getTeamByName.mockReturnValueOnce(null);

            const result = await store.dispatch(Actions.getChannelsByTeamName(team.name));
            expect(result.error).toBeDefined();

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);

            const state = store.getState();
            expect(TeamSelectors.getTeamByName).toHaveBeenCalledWith(state, team.name);
        });

        it('does not dispatch if team is current team', async () => {
            TeamSelectors.getCurrentTeamId.mockReturnValueOnce(team.id);
            TeamSelectors.getTeamByName.mockReturnValueOnce(team);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.getChannelsByTeamName(team.name));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
    
            const state = store.getState();
            expect(TeamSelectors.getTeamByName).toHaveBeenCalledWith(state, team.name);
        });

        it ('dispatches getMyChannelsAndMembersForTeam', async () => {
            TeamSelectors.getTeamByName.mockReturnValueOnce(team);

            expectedResult = {data: true};
            const result = await store.dispatch(Actions.getChannelsByTeamName(team.name));
            expect(result).toStrictEqual(expectedResult);

            expectedActions = [
                ChannelRequestorActions.getMyChannelsAndMembersForTeam(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(TeamSelectors.getTeamByName).toHaveBeenCalledWith(state, team.name);
            expect(ChannelRequestorActions.getMyChannelsAndMembersForTeam).toHaveBeenCalledWith(team.id);
        });
    });

    describe('markChannelAsUnread', () => {
        const user = TestHelper.fakeUser();
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            CommonSelectors.getCurrentUserId = jest.fn().mockReturnValue(user.id)
            ChannelSelectors.getChannel = jest.fn().mockReturnValue(channel);
            ChannelActionObjects.incrementTotalMessageCount = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('increment-total-message-count'));
            ChannelActionObjects.incrementUnreadMessageCount = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('increment-unread-message-count'));
            ChannelActionObjects.incrementUnreadMentionCount = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('increment-unread-mention-count'));

            CommonSelectors.getCurrentUserId = jest.fn();
            ChannelSelectors.getMyChannelMember = jest.fn();
        });

        it('dispatches incrementTotalMessageCount and incrementUnreadMessageCount with correct onlyMentions value', async () => {
            const mentions = [];
            const onlyMentionsValues = [true, false];

            for (i = 0; i < onlyMentionsValues.length; i++) {
                const onlyMentions = onlyMentionsValues[i];
                const channelMember = {
                    ...TestHelper.fakeChannelMember(),
                    notify_props: {
                        mark_unread: onlyMentions ? General.MENTION : null,
                    },
                };
                ChannelSelectors.getMyChannelMember.mockReturnValueOnce(channelMember);

                const expectedResult = {data: true};
                const result = await store.dispatch(Actions.markChannelAsUnread(channel.id, mentions));
                expect(result).toEqual(expectedResult);

                const expectedActions = [
                    TestHelper.buildBatchAction([
                        ChannelActionObjects.incrementTotalMessageCount(),
                        ChannelActionObjects.incrementUnreadMessageCount(),
                    ]),
                ];
                const actions = store.getActions();
                expect(actions).toStrictEqual(expectedActions);
                store.clearActions();

                const state = store.getState();
                expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, channel.id);
                expect(ChannelActionObjects.incrementTotalMessageCount).toHaveBeenCalledWith(channel.id, 1);
                expect(ChannelActionObjects.incrementUnreadMessageCount).toHaveBeenCalledWith(channel, 1, onlyMentions);
            }
        });

        it('dispatches incrementUnreadMentionCount only when mentions includes current user id', async () => {
            const mentionsValues = [
                [],
                [`not-${user.id}`],
                [`not-${user.id}`, user.id],
            ];

            for (i = 0; i < mentionsValues.length; i ++) {
                const mentions = mentionsValues[i];
                const channelMember = {
                    ...TestHelper.fakeChannelMember(),
                    notify_props: {
                        mark_unread: General.MENTION,
                    },
                };
                ChannelSelectors.getMyChannelMember.mockReturnValueOnce(channelMember);
                CommonSelectors.getCurrentUserId.mockReturnValueOnce(user.id);

                const expectedResult = {data: true};
                const result = await store.dispatch(Actions.markChannelAsUnread(channel.id, mentions));
                expect(result).toEqual(expectedResult);

                let expectedActions;
                if (mentions.includes(user.id)) {
                    expectedActions = [
                        TestHelper.buildBatchAction([
                            ChannelActionObjects.incrementTotalMessageCount(),
                            ChannelActionObjects.incrementUnreadMessageCount(),
                            ChannelActionObjects.incrementUnreadMentionCount(),
                        ]),
                    ];
                } else {
                    expectedActions = [
                        TestHelper.buildBatchAction([
                            ChannelActionObjects.incrementTotalMessageCount(),
                            ChannelActionObjects.incrementUnreadMessageCount(),
                        ]),
                    ];
                }
                const actions = store.getActions();
                expect(actions).toStrictEqual(expectedActions);
                store.clearActions();

                const state = store.getState();
                expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, channel.id);

                if (mentions.includes(user.id)) {
                    expect(ChannelActionObjects.incrementTotalMessageCount).toHaveBeenCalledWith(channel.id, 1);
                    expect(ChannelActionObjects.incrementUnreadMessageCount).toHaveBeenCalledWith(channel, 1, true);
                    expect(ChannelActionObjects.incrementUnreadMentionCount).toHaveBeenCalledWith(channel, 1);
                } else {
                    expect(ChannelActionObjects.incrementTotalMessageCount).toHaveBeenCalledWith(channel.id, 1);
                    expect(ChannelActionObjects.incrementUnreadMessageCount).toHaveBeenCalledWith(channel, 1, true);
                }
            };
        });
    });

    describe('markChannelViewedAndRead', () => {
        const mockActionsFunc = () => ([{
            type: 'action-1'
        }, {
            type: 'action-2',
        }]);

        beforeEach(() => {
            jest.restoreAllMocks();

            ChannelActionHelpers.markChannelAsViewedAndReadActions = jest.fn(mockActionsFunc);
        });

        it('dispatches markChannelAsViewedAndReadActions', async () => {
            const channelId = TestHelper.generateId();
            const prevChannelId = TestHelper.generateId();
            const markOnServer = false;

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelViewedAndRead(channelId, prevChannelId, markOnServer));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction(
                    ChannelActionHelpers.markChannelAsViewedAndReadActions(),
                    'BATCH_MARK_CHANNEL_VIEWED_AND_READ',
                ),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ChannelActionHelpers.markChannelAsViewedAndReadActions).toHaveBeenCalledWith(state, channelId, prevChannelId, markOnServer);
        });
    });

    describe('favoriteChannel', () => {
        const userId = TestHelper.generateId();
        const channelId = TestHelper.generateId();
        const favoriteChannelPreference = PrefrenceUtils.buildPreference(
            Preferences.CATEGORY_FAVORITE_CHANNEL,
            userId,
            channelId,
            'true',
        );

        beforeEach(() => {
            jest.restoreAllMocks();

            CommonSelectors.getCurrentUserId = jest.fn().mockReturnValue(userId);
            PreferenceActions.savePreferences = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('save-preferences'));
            Client4.trackEvent = jest.fn();
        });

        it('dispatches savePreferences and tracks event', async () => {
            await store.dispatch(Actions.favoriteChannel(channelId));

            const expectedActions = [
                PreferenceActions.savePreferences(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            expect(PreferenceActions.savePreferences).toHaveBeenCalledWith(userId, [favoriteChannelPreference]);

            expectedCategory = 'action';
            expectedEvent = 'action_channels_favorite';
            expect(Client4.trackEvent).toHaveBeenCalledWith(expectedCategory, expectedEvent);
        });
    });

    describe('unfavoriteChannel', () => {
        const userId = TestHelper.generateId();
        const channelId = TestHelper.generateId();
        const unfavoriteChannelPreference = PrefrenceUtils.buildPreference(
            Preferences.CATEGORY_FAVORITE_CHANNEL,
            userId,
            channelId,
            '',
        );

        beforeEach(() => {
            jest.restoreAllMocks();

            CommonSelectors.getCurrentUserId = jest.fn().mockReturnValue(userId);
            PreferenceActions.deletePreferences = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('delete-preferences'));
            Client4.trackEvent = jest.fn();
        });

        it('dispatches deletePrefrences and tracks event', async () => {
            await store.dispatch(Actions.unfavoriteChannel(channelId));

            const expectedActions = [
                PreferenceActions.deletePreferences(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            expect(PreferenceActions.deletePreferences).toHaveBeenCalledWith(userId, [unfavoriteChannelPreference]);

            expectedCategory = 'action';
            expectedEvent = 'action_channels_unfavorite';
            expect(Client4.trackEvent).toHaveBeenCalledWith(expectedCategory, expectedEvent);
        });
    });

    describe('markChannelAsViewed', () => {
        const channel = TestHelper.fakeChannel();
        const prevChannel = TestHelper.fakeChannel();
        const channelMember = TestHelper.fakeChannelMember();
        const prevChannelMember = TestHelper.fakeChannelMember();

        beforeEach(() => {
            jest.restoreAllMocks();

            ChannelSelectors.getMyChannelMember = jest.fn();
            ChannelSelectors.isManuallyUnread = jest.fn();

            RoleActions.loadRolesIfNeeded = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-roles'));
            ChannelActionObjects.receivedMyChannelMember = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('received-channel-member'));
            ChannelActionObjects.removeManuallyUnread = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('remove-manually-unread'));
        });

        it('does not dispatch if not member of channel nor previous channel', async () => {
            ChannelSelectors.getMyChannelMember.
                mockReturnValueOnce(null).
                mockReturnValueOnce(null);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsViewed(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);

            const state = store.getState();
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, channel.id);
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, prevChannel.id);
        });

        it('dispatches when member of channel that is not manually unread', async () => {
            ChannelSelectors.getMyChannelMember.
                mockReturnValueOnce(channelMember).
                mockReturnValueOnce(null);

            ChannelSelectors.isManuallyUnread.
                mockReturnValue(false);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsViewed(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                RoleActions.loadRolesIfNeeded(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedMyChannelMember(),
                ]),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, channel.id);
            expect(RoleActions.loadRolesIfNeeded).toHaveBeenCalledWith(channelMember.roles.split(' '));
            expect(ChannelActionObjects.receivedMyChannelMember).toHaveBeenCalledWith(channelMember);
            expect(ChannelSelectors.isManuallyUnread).toHaveBeenCalledWith(state, channel.id);
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, prevChannel.id);
        });

        it('dispatches when member of channel that is manually unread', async () => {
            ChannelSelectors.getMyChannelMember.
                mockReturnValueOnce(channelMember).
                mockReturnValueOnce(null);

            ChannelSelectors.isManuallyUnread.
                mockReturnValue(true);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsViewed(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                RoleActions.loadRolesIfNeeded(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedMyChannelMember(),
                    ChannelActionObjects.removeManuallyUnread(),
                ]),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, channel.id);
            expect(RoleActions.loadRolesIfNeeded).toHaveBeenCalledWith(channelMember.roles.split(' '));
            expect(ChannelActionObjects.receivedMyChannelMember).toHaveBeenCalledWith(channelMember);
            expect(ChannelSelectors.isManuallyUnread).toHaveBeenCalledWith(state, channel.id);
            expect(ChannelActionObjects.removeManuallyUnread).toHaveBeenCalledWith(channel.id);
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, prevChannel.id);
        });

        it('dispatches when member of previous channel that is not manually unread', async () => {
            ChannelSelectors.getMyChannelMember.
                mockReturnValueOnce(null).
                mockReturnValueOnce(prevChannelMember);

            ChannelSelectors.isManuallyUnread.
                mockReturnValue(false);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsViewed(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                RoleActions.loadRolesIfNeeded(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedMyChannelMember(),
                ]),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, channel.id);
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, prevChannel.id);
            expect(ChannelSelectors.isManuallyUnread).toHaveBeenCalledWith(state, prevChannel.id);
            expect(RoleActions.loadRolesIfNeeded).toHaveBeenCalledWith(prevChannelMember.roles.split(' '));
            expect(ChannelActionObjects.receivedMyChannelMember).toHaveBeenCalledWith(prevChannelMember);
        });

        it('does not dispatch for previous channel that is manually unread', async () => {
            ChannelSelectors.getMyChannelMember.
                mockReturnValueOnce(null).
                mockReturnValueOnce(prevChannelMember);

            ChannelSelectors.isManuallyUnread.
                mockReturnValueOnce(true);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsViewed(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);

            const state = store.getState();
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, channel.id);
            expect(ChannelSelectors.getMyChannelMember).toHaveBeenCalledWith(state, prevChannel.id);
            expect(ChannelSelectors.isManuallyUnread).toHaveBeenCalledWith(state, prevChannel.id);
        });
    });

    describe('addMultipleChannelMembers', () => {
        const channelId = TestHelper.generateId();

        beforeEach(() => {
            jest.restoreAllMocks();

            ChannelRequestorActions.addChannelMember = jest.fn();
        });

        it('does not dispatch when userIds is empty', async () => {
            const userIds = [];

            const emptyResults = [];
            const results = await store.dispatch(Actions.addMultipleChannelMembers(channelId, userIds));
            expect(results).toStrictEqual(emptyResults);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('dispatches until error thrown in addChannelMember', async () => {
            const mockAction1 = {type: 'action-1'};
            const mockAction2 = {type: 'action-2'};
            const mockError = new Error();
            const mockAction3 = {type: 'action-3'};

            ChannelRequestorActions.addChannelMember.
                mockImplementationOnce(() => mockAction1).
                mockImplementationOnce(() => mockAction2).
                mockImplementationOnce(() => {throw mockError}).
                mockImplementationOnce(() => mockAction3);

            const userIds = ['user-1', 'user-2', 'user-3', 'user-4'];
            const results = await store.dispatch(Actions.addMultipleChannelMembers(channelId, userIds));
            expect(results).toEqual(mockError);

            const expectedActions = [mockAction1, mockAction2];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            expect(ChannelRequestorActions.addChannelMember).toHaveBeenCalledWith(channelId, userIds[0]);
            expect(ChannelRequestorActions.addChannelMember).toHaveBeenCalledWith(channelId, userIds[1]);
        });
    });

    describe('removeMultipleChannelMembers', () => {
        const channelId = 'channel-id';

        beforeEach(() => {
            jest.resetAllMocks();

            ChannelRequestorActions.removeChannelMember = jest.fn();
        });

        it('does not dispatch when userIds is empty', async () => {
            const userIds = [];

            const emptyResults = [];
            const results = await store.dispatch(Actions.removeMultipleChannelMembers(channelId, userIds));
            expect(results).toStrictEqual(emptyResults);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('dispatches until error thrown in removeChannelMember', async () => {
            const mockAction1 = {type: 'action-1'};
            const mockAction2 = {type: 'action-2'};
            const mockError = new Error();
            const mockAction3 = {type: 'action-3'};

            ChannelRequestorActions.removeChannelMember.
                mockImplementationOnce(() => mockAction1).
                mockImplementationOnce(() => mockAction2).
                mockImplementationOnce(() => {throw mockError}).
                mockImplementationOnce(() => mockAction3);

            const userIds = ['user-1', 'user-2', 'user-3', 'user-4'];
            const results = await store.dispatch(Actions.removeMultipleChannelMembers(channelId, userIds));
            expect(results).toEqual(mockError);

            const expectedActions = [mockAction1, mockAction2];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            expect(ChannelRequestorActions.removeChannelMember).toHaveBeenCalledWith(channelId, userIds[0]);
            expect(ChannelRequestorActions.removeChannelMember).toHaveBeenCalledWith(channelId, userIds[1]);
        });
    });

    describe('loadDirectMessages', () => {
        const channels = [
            TestHelper.fakeChannel(),
            TestHelper.fakeChannel(),
        ];
        const channelMembers = [
            TestHelper.fakeChannelMember(),
            TestHelper.fakeChannelMember(),
        ];

        beforeEach(() => {
            jest.restoreAllMocks();

            ChannelActionHelpers.loadDirectMessagesActions = jest.fn();
        });

        it('does not dispatch when loadDirectMessagesActions is empty', async () => {
            ChannelActionHelpers.loadDirectMessagesActions.mockReturnValueOnce([]);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.loadDirectMessages(channels, channelMembers));
            expect(result).toStrictEqual(expectedResult)

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);

            const state = store.getState();
            expect(ChannelActionHelpers.loadDirectMessagesActions).toHaveBeenCalledWith(state, channels, channelMembers);
        });

        it('batch dispatches loadDirectMessagesActions', async () => {
            const mockActions = [{type: 'action-1'}, {type: 'action-2'}];
            ChannelActionHelpers.loadDirectMessagesActions.mockReturnValueOnce(mockActions);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.loadDirectMessages(channels, channelMembers));
            expect(result).toStrictEqual(expectedResult)

            const expectedActions = [
                TestHelper.buildBatchAction(mockActions, 'BATCH_LOAD_DIRECT_MESSAGES'),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ChannelActionHelpers.loadDirectMessagesActions).toHaveBeenCalledWith(state, channels, channelMembers);
        });
    });
});