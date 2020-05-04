// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {Client4} from '@mm-redux/client';

import {General, Preferences} from '@mm-redux/constants';

import * as ChannelSelectors from '@mm-redux/selectors/entities/channels';
import * as CommonSelectors from '@mm-redux/selectors/entities/common';
import * as GeneralSelectors from '@mm-redux/selectors/entities/general';
import * as TeamSelectors from '@mm-redux/selectors/entities/teams';
import * as ChannelActionHelpers from '@actions/helpers/channels';
import * as GeneralActionHelpers from '@actions/helpers/general';
import * as ChannelActionObjects from '@actions/channels/action_objects';
import * as ChannelHighOrderActions from '@actions/channels/high_order_actions';
import * as ChannelViewsActions from '@actions/views/channels';
import * as PostViewsHighOrderActions from '@actions/views/post/high_order_actions';

import * as ErrorActions from '@mm-redux/actions/errors';
import * as RoleActions from '@mm-redux/actions/roles';
import * as PreferenceActions from '@mm-redux/actions/preferences';
import * as UserActions from '@mm-redux/actions/users';

import * as PreferenceUtils from '@utils/preferences';
import * as ChannelUtils from '@mm-redux/utils/channel_utils';

import TestHelper from 'test/test_helper';

import * as ChannelSelectionActions from './channel_selection_actions';
import * as Actions from './requestor_actions';

describe('Actions.Channels.RequestorActions', () => {
    let store;
    const createMockStore = configureStore([thunk]);

    beforeEach(() => {
        store = createMockStore({});
    });

    describe('createChannel', () => {
        const channel = TestHelper.fakeChannel();
        const channelMember = TestHelper.fakeChannelMember();
        const user = TestHelper.fakeUser();

        let createMemberForNewChannelSpy;

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.createChannel = jest.fn();
            ChannelSelectors.getChannel = jest.fn();
            ChannelSelectors.getMyChannelMember = jest.fn();
            createMemberForNewChannelSpy = jest.spyOn(ChannelActionHelpers, 'createMemberForNewChannel');

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
            RoleActions.loadRolesIfNeeded = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-roles'));
        });

        afterEach(() => {
            createMemberForNewChannelSpy.mockRestore();
        });

        it('should dispatch createChannelFailure when Client4.createChannel throws error', async () => {
            Client4.createChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.createChannel(channel, user.id));
            expect(result.error).toBeDefined();
            expect(Client4.createChannel).toHaveBeenCalledWith(channel);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.createChannelFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch receivedChannel, receivedMyChannelMember, nor loadRolesIfNeeded when channel and member are in state', async () => {
            Client4.createChannel.mockReturnValueOnce(channel);
            ChannelSelectors.getChannel.mockReturnValueOnce(channel);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(channelMember);

            expectedResult = {data: channel};
            const result = await store.dispatch(Actions.createChannel(channel, user.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.createChannelSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch receivedChannel, receivedMyChannelMember, and loadRolesIfNeeded when channel and member are not in state', async () => {
            Client4.createChannel.mockReturnValueOnce(channel);
            ChannelSelectors.getChannel.mockReturnValueOnce(null);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(null);
            createMemberForNewChannelSpy.mockReturnValueOnce(channelMember);

            expectedResult = {data: channel};
            const result = await store.dispatch(Actions.createChannel(channel, user.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedRoles = [General.CHANNEL_USER_ROLE, General.CHANNEL_ADMIN_ROLE];
            const expectedActions = [
                RoleActions.loadRolesIfNeeded(expectedRoles),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(channel),
                    ChannelActionObjects.receivedMyChannelMember(channelMember),
                    ChannelActionObjects.createChannelSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('createDirectChannel', () => {
        const user = TestHelper.fakeUser();
        const otherUser = TestHelper.fakeUser();
        const mockPreference = {category: 'mock'};

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.createDirectChannel = jest.fn();
            PreferenceUtils.buildPreference = jest.fn().mockReturnValue(mockPreference);

            PreferenceActions.savePreferences = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('save-preferences'));
            PreferenceActions.receivedPreferences = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('received-preferences'));
            UserActions.receivedProfilesListInChannel = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('received-profiles'));
            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
            RoleActions.loadRolesIfNeeded = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-roles'));
        });

        it('should dispatch createChannelFailure when Client4.createDirectChannel throws error', async () => {
            Client4.createDirectChannel.mockImplementation(() => {throw new Error()});

            const result = await store.dispatch(Actions.createDirectChannel(user.id, otherUser.id));
            expect(result.error).toBeDefined();
            expect(Client4.createDirectChannel).toHaveBeenCalledWith([user.id, otherUser.id]);

            const expectedActions = [
                ChannelActionObjects.createChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.createChannelFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.createDirectChannel succeeds', async () => {
            const expectedChannel = TestHelper.fakeChannel();
            Client4.createDirectChannel.mockReturnValueOnce(expectedChannel);
            
            const expectedRoles = [General.CHANNEL_USER_ROLE];
            const expectedMember = ChannelActionHelpers.createMemberForNewChannel(expectedChannel, user.id, expectedRoles);
            const expectedPreferences = [mockPreference, mockPreference];
            const expectedProfiles = [{id: user.id}, {id: otherUser.id}];
            const expectedResult = {data: expectedChannel};
            const expectedActions = [
                ChannelActionObjects.createChannelRequest(),
                PreferenceActions.savePreferences(user.id, expectedPreferences),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(expectedChannel),
                    ChannelActionObjects.receivedMyChannelMember(expectedMember),
                    PreferenceActions.receivedPreferences(expectedPreferences),
                    ChannelActionObjects.createChannelSuccess(),
                    UserActions.receivedProfilesListInChannel(expectedChannel.id, expectedProfiles),
                ]),
                RoleActions.loadRolesIfNeeded(expectedRoles),
            ];

            const result = await store.dispatch(Actions.createDirectChannel(user.id, otherUser.id));
            expect(result).toStrictEqual(expectedResult);

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            expect(PreferenceUtils.buildPreference).toHaveBeenCalledTimes(2);

            const firstCallArgs = PreferenceUtils.buildPreference.mock.calls[0];
            expect(firstCallArgs[0]).toEqual(Preferences.CATEGORY_CHANNEL_OPEN_TIME);
            expect(firstCallArgs[1]).toEqual(user.id);
            expect(firstCallArgs[2]).toEqual(expectedChannel.id);
            // The last arg is a timestamp string computed in createDirectChannel

            const secondCallArgs = PreferenceUtils.buildPreference.mock.calls[1];
            expect(secondCallArgs).toEqual([
                Preferences.CATEGORY_DIRECT_CHANNEL_SHOW,
                user.id,
                otherUser.id,
                'true',
            ]);
        });
    });

    describe('createGroupChannel', () => {
        const channel = TestHelper.fakeChannel();
        const currentUser = TestHelper.fakeUser();
        const otherUser = TestHelper.fakeUser();
        const userIds = [currentUser.id, otherUser.id];

        beforeEach(() => {
            jest.restoreAllMocks();
    
            Client4.createGroupChannel = jest.fn();
            Client4.getMyChannelMember = jest.fn();
            ChannelSelectors.getMyChannelMember = jest.fn();
            CommonSelectors.getCurrentUserId = jest.fn().mockReturnValue(currentUser.id);
    
            PreferenceActions.markGroupChannelOpen = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('mark-group-channel-open'));
            RoleActions.loadRolesIfNeeded = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-roles'));
            UserActions.receivedProfilesListInChannel = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('received-profiles'));
            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });


        it('should dispatch createChannelFailure when Client4.createGroupChannel throws error', async () => {
            Client4.createGroupChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.createGroupChannel(userIds));
            expect(result.error).toBeDefined();
            expect(Client4.createGroupChannel).toHaveBeenCalledWith(userIds);

            const expectedActions = [
                ChannelActionObjects.createChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.createChannelFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch with created member when created group channel has no posts', async () => {
            const expectedChannel = {
                ...channel,
                total_msg_count: 0,
            };
            Client4.createGroupChannel.mockReturnValueOnce(expectedChannel);
            
            const roles = [General.CHANNEL_USER_ROLE];
            const expectedMember = ChannelActionHelpers.createMemberForNewChannel(expectedChannel, currentUser.id, roles);
            const expectedProfiles = [
                ...userIds.map((id) => ({id})),
                {id: currentUser.id},
            ];

            const expectedActions = [
                ChannelActionObjects.createChannelRequest(),
                PreferenceActions.markGroupChannelOpen(expectedChannel.id),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(expectedChannel),
                    ChannelActionObjects.receivedMyChannelMember(expectedMember),
                    ChannelActionObjects.createChannelSuccess(),
                    UserActions.receivedProfilesListInChannel(expectedChannel.id, expectedProfiles),
                ]),
                RoleActions.loadRolesIfNeeded(expectedMember.roles.split(' ')),
            ];
            const expectedResult = {data: expectedChannel};

            const result = await store.dispatch(Actions.createGroupChannel(userIds));
            expect(result).toStrictEqual(expectedResult);

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch with existing member when created group channel already has posts and member exists', async () => {
            const expectedChannel = {
                ...channel,
                total_msg_count: 1,
            };
            Client4.createGroupChannel.mockReturnValueOnce(expectedChannel);
            
            const expectedMember = {
                ...TestHelper.fakeChannelMember(),
                roles: 'fake-role-1, fake-role-2',
            };
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(expectedMember);

            const expectedProfiles = [
                ...userIds.map((id) => ({id})),
                {id: currentUser.id},
            ];

            const expectedActions = [
                ChannelActionObjects.createChannelRequest(),
                PreferenceActions.markGroupChannelOpen(expectedChannel.id),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(expectedChannel),
                    ChannelActionObjects.receivedMyChannelMember(expectedMember),
                    ChannelActionObjects.createChannelSuccess(),
                    UserActions.receivedProfilesListInChannel(expectedChannel.id, expectedProfiles),
                ]),
                RoleActions.loadRolesIfNeeded(expectedMember.roles.split(' ')),
            ];
            const expectedResult = {data: expectedChannel};

            const result = await store.dispatch(Actions.createGroupChannel(userIds));
            expect(result).toStrictEqual(expectedResult);

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch with created member when created group channel already has posts and member does not exist but fetch member fails', async () => {
            const expectedChannel = {
                ...channel,
                total_msg_count: 1,
            };
            Client4.createGroupChannel.mockReturnValueOnce(expectedChannel);
            
            const roles = [General.CHANNEL_USER_ROLE];
            const expectedMember = ChannelActionHelpers.createMemberForNewChannel(expectedChannel, currentUser.id, roles);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(null);

            const expectedError = new Error();
            Client4.getMyChannelMember.mockImplementationOnce(() => {throw expectedError});

            const expectedProfiles = [
                ...userIds.map((id) => ({id})),
                {id: currentUser.id},
            ];

            const expectedActions = [
                ChannelActionObjects.createChannelRequest(),
                ErrorActions.logError(expectedError),
                PreferenceActions.markGroupChannelOpen(expectedChannel.id),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(expectedChannel),
                    ChannelActionObjects.receivedMyChannelMember(expectedMember),
                    ChannelActionObjects.createChannelSuccess(),
                    UserActions.receivedProfilesListInChannel(expectedChannel.id, expectedProfiles),
                ]),
                RoleActions.loadRolesIfNeeded(expectedMember.roles.split(' ')),
            ];
            const expectedResult = {data: expectedChannel};

            const result = await store.dispatch(Actions.createGroupChannel(userIds));
            expect(result).toStrictEqual(expectedResult);

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch with fetched member when created group channel already has posts and member does not exists', async () => {
            const expectedChannel = {
                ...channel,
                total_msg_count: 1,
            };
            Client4.createGroupChannel.mockReturnValueOnce(expectedChannel);
            
            const expectedMember = {
                ...TestHelper.fakeChannelMember(),
                roles: 'fake-role-1, fake-role-2',
            };
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(null);
            Client4.getMyChannelMember.mockReturnValueOnce(expectedMember);

            const expectedProfiles = [
                ...userIds.map((id) => ({id})),
                {id: currentUser.id},
            ];

            const expectedActions = [
                ChannelActionObjects.createChannelRequest(),
                PreferenceActions.markGroupChannelOpen(expectedChannel.id),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(expectedChannel),
                    ChannelActionObjects.receivedMyChannelMember(expectedMember),
                    ChannelActionObjects.createChannelSuccess(),
                    UserActions.receivedProfilesListInChannel(expectedChannel.id, expectedProfiles),
                ]),
                RoleActions.loadRolesIfNeeded(expectedMember.roles.split(' ')),
            ];
            const expectedResult = {data: expectedChannel};

            const result = await store.dispatch(Actions.createGroupChannel(userIds));
            expect(result).toStrictEqual(expectedResult);

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getChannels', () => {
        const team = TestHelper.fakeTeam()

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getChannels = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch getChannelsFailure when Client4.getChannels throws error', async () => {
            Client4.getChannels.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getChannels(team.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannels).toHaveBeenCalledWith(team.id, page=0, number=General.CHANNELS_CHUNK_SIZE);

            const expectedActions = [
                ChannelActionObjects.getChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.getChannelsFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.getChannels succeeds', async () => {
            const channels = [
                TestHelper.fakeChannel(),
                TestHelper.fakeChannel(),
            ];
            Client4.getChannels.mockReturnValueOnce(channels);

            const expectedResult = {data: channels};
            const result = await store.dispatch(Actions.getChannels(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.getChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannels(team.id, channels),
                    ChannelActionObjects.getChannelsSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getAllChannels', () => {
        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getAllChannels = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch getAllChannelsFailure when Client4.getAllChannels throws error', async () => {
            Client4.getAllChannels.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getAllChannels());
            expect(result.error).toBeDefined();
            expect(Client4.getAllChannels).toHaveBeenCalledWith(page=0, number=General.CHANNELS_CHUNK_SIZE, notAssociatedToGroup='', excludeDefaultChannels=false);

            const expectedActions = [
                ChannelActionObjects.getAllChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.getAllChannelsFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.getAllChannels succeeds', async () => {
            const channels = [
                TestHelper.fakeChannel(),
                TestHelper.fakeChannel(),
            ];
            Client4.getAllChannels.mockReturnValueOnce(channels);

            const expectedResult = {data: channels};
            const result = await store.dispatch(Actions.getAllChannels());
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.getAllChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedAllChannels(channels),
                    ChannelActionObjects.getAllChannelsSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getAllChannelsWithCount', () => {
        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getAllChannels = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch getAllChannelsFailure when Client4.getAllChannels throws error', async () => {
            Client4.getAllChannels.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getAllChannelsWithCount());
            expect(result.error).toBeDefined();
            expect(Client4.getAllChannels).toHaveBeenCalledWith(page=0, number=General.CHANNELS_CHUNK_SIZE, notAssociatedToGroup='', excludeDefaultChannels=false, includeTotalCount=true);

            const expectedActions = [
                ChannelActionObjects.getAllChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.getAllChannelsFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.getAllChannels succeeds', async () => {
            const channels = [
                TestHelper.fakeChannel(),
                TestHelper.fakeChannel(),
            ];
            Client4.getAllChannels.mockReturnValueOnce({channels, total_count: channels.length});

            const expectedResult = {data: {channels, total_count: channels.length}};
            const result = await store.dispatch(Actions.getAllChannelsWithCount());
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.getAllChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedAllChannels(channels),
                    ChannelActionObjects.getAllChannelsSuccess(),
                    ChannelActionObjects.receivedTotalChannelCount(channels.length),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getArchivedChannels', () => {
        const team = TestHelper.fakeTeam();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getArchivedChannels = jest.fn();
        });

        it('should not dispatch when Client4.getArchivedChannels throws error', async () => {
            Client4.getArchivedChannels.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getArchivedChannels(team.id));
            expect(result.error).toBeDefined();
            expect(Client4.getArchivedChannels).toHaveBeenCalledWith(team.id, page=0, perPage=General.CHANNELS_CHUNK_SIZE);

            const emptyActions = [];

            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should dispatch when Client4.getArchivedChannels succeeds', async () => {
            const channels = [
                TestHelper.fakeChannel(),
                TestHelper.fakeChannel(),
            ];
            Client4.getArchivedChannels.mockReturnValueOnce(channels);

            const expectedResult = {data: channels};
            const result = await store.dispatch(Actions.getArchivedChannels(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.receivedChannels(team.id, channels),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getChannelsForSearch', () => {
        const team = TestHelper.fakeTeam();
        const term = 'term';

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.searchArchivedChannels = jest.fn();
            Client4.searchChannels = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch getChannelsFailure when Client4.searchArchivedChannels or Client4.searchChannels throws error', async () => {
            Client4.searchArchivedChannels.mockImplementationOnce(() => {throw new Error()});
            Client4.searchChannels.mockImplementationOnce(() => {throw new Error()});

            const searchArchivedValues = [true, false];
            searchArchivedValues.forEach((searchArchived) => async () => {
                const result = await store.dispatch(Actions.getChannelsForSearch(team.id, term, searchArchived));
                expect(result.error).toBeDefined();
                if (searchArchived) {
                    expect(Client4.searchArchivedChannels).toHaveBeenCalledWith(team.id, term);
                } else {
                    expect(Client4.searchChannels).toHaveBeenCalledWith(team.id, term);
                }

                const expectedActions = [
                    ChannelActionObjects.getChannelsRequest(),
                    TestHelper.buildBatchAction([
                        ChannelActionObjects.getChannelsFailure(result.error),
                        ErrorActions.logError(result.error),
                    ]),
                ];

                const actions = store.getActions();
                expect(actions).toStrictEqual(expectedActions);
            });
        });

        it('should dispatch when Client4.searchArchivedChannels or Client4.searchChannels succeeds', async () => {
            const channels = [
                TestHelper.fakeChannel(),
                TestHelper.fakeChannel(),
            ];
            Client4.searchArchivedChannels.mockReturnValueOnce(channels);
            Client4.searchChannels.mockReturnValueOnce(channels);

            const searchArchivedValues = [true, false];
            searchArchivedValues.forEach((searchArchived) => async () => {
                const expectedResult = {data: channels};
                const result = await store.dispatch(Actions.getChannelsForSearch(team.id, term));
                expect(result).toStrictEqual(expectedResult);
                if (searchArchived) {
                    expect(Client4.searchArchivedChannels).toHaveBeenCalledTimes(1);
                } else {
                    expect(Client4.searchChannels).toHaveBeenCalledTimes(1);
                }

                const expectedActions = [
                    ChannelActionObjects.getChannelsRequest(),
                    TestHelper.buildBatchAction([
                        ChannelActionObjects.receivedChannels(team.id, channels),
                        ChannelActionObjects.getChannelsSuccess(),
                    ]),
                ];

                const actions = store.getActions();
                expect(actions).toStrictEqual(expectedActions);
            });
        });
    });

    describe('getAllChannelsForSearch', () => {
        const term = 'term';

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.searchAllChannels = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch getAllChannelsFailure when Client4.searchAllChannels throws error', async () => {
            Client4.searchAllChannels.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getAllChannelsForSearch(term));
            expect(result.error).toBeDefined();
            expect(Client4.searchAllChannels).toHaveBeenCalledWith(term, notAssociatedToGroup='', excludeDefaultChannels=false, page=undefined, perPage=undefined);

            const expectedActions = [
                ChannelActionObjects.getAllChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.getAllChannelsFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.searchAllChannels succeeds', async () => {
            const channels = [
                TestHelper.fakeChannel(),
                TestHelper.fakeChannel(),
            ];
            Client4.searchAllChannels.mockReturnValueOnce(channels);

            const expectedResult = {data: channels};
            const result = await store.dispatch(Actions.getAllChannelsForSearch(term));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.getAllChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedAllChannels(channels),
                    ChannelActionObjects.getAllChannelsSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getChannelsForAutocompleteSearch', () => {
        const team = TestHelper.fakeTeam();
        const term = 'term';

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.autocompleteChannelsForSearch = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch getChannelsFailure when Client4.autocompleteChannelsForSearch throws error', async () => {
            Client4.autocompleteChannelsForSearch.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getChannelsForAutocompleteSearch(team.id, term));
            expect(result.error).toBeDefined();
            expect(Client4.autocompleteChannelsForSearch).toHaveBeenCalledWith(team.id, term);

            const expectedActions = [
                ChannelActionObjects.getChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.getChannelsFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.autocompleteChannelsForSearch succeeds', async () => {
            const channels = [
                TestHelper.fakeChannel(),
                TestHelper.fakeChannel(),
            ];
            Client4.autocompleteChannelsForSearch.mockReturnValueOnce(channels);

            const expectedResult = {data: channels};
            const result = await store.dispatch(Actions.getChannelsForAutocompleteSearch(team.id, term));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.getChannelsRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannels(team.id, channels),
                    ChannelActionObjects.getChannelsSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getMyChannelsAndMembersForTeam', () => {
        const team = TestHelper.fakeTeam();
        const currentUser = TestHelper.fakeUser();
        const channels = [
            TestHelper.fakeChannel(),
            TestHelper.fakeChannel(),
        ];
        const channelMembers = [
            TestHelper.fakeChannelMember(),
            TestHelper.fakeChannelMember(),
        ];

        beforeEach(() => {
            jest.clearAllMocks();

            Client4.getMyChannels = jest.fn();
            Client4.getMyChannelMembers = jest.fn();
            Client4.getRolesByNames = jest.fn();
            ChannelSelectors.getChannelsInTeam = jest.fn();
            CommonSelectors.getCurrentUserId = jest.fn().mockReturnValue(currentUser.id);
    
            ChannelHighOrderActions.loadDirectMessages = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-direct-messages'));
            PostViewsHighOrderActions.loadUnreadChannelPosts = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-unread-posts'));
        });

        it('should not dispatch and return empty data when no currentUserId', async () => {
            CommonSelectors.getCurrentUserId.mockReturnValueOnce(null);

            const expectedResult = {data: {}};
            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should not dispatch and return non-null error when promisesWithRetry throws an error and channels are not already in state', async () => {
            const promisesWithRetrySpy = jest.spyOn(GeneralActionHelpers, 'promisesWithRetry').
                mockImplementation(() => {throw new Error()});

            const channelsInTeamValues = [
                null,
                {[`not-${team.id}`]: channels},
                {[team.id]: []},
            ];
            for (i = 0; i < channelsInTeamValues.length; i++) {
                const channelsInTeam = channelsInTeamValues[i];
                ChannelSelectors.getChannelsInTeam.mockReturnValueOnce(channelsInTeam);

                const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
                expect(result.error).not.toBeNull();

                const emptyActions = [];
                const actions = store.getActions();
                expect(actions).toStrictEqual(emptyActions);
            };

            promisesWithRetrySpy.mockRestore();
        });

        it('should not dispatch and return null error when promisesWithRetry throws an error and channels are already in state', async () => {
            const promisesWithRetrySpy = jest.spyOn(GeneralActionHelpers, 'promisesWithRetry').
                mockImplementation(() => {throw new Error()});

            const channelsInTeam = {[team.id]: channels};
            ChannelSelectors.getChannelsInTeam.mockReturnValueOnce(channelsInTeam);

            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result.error).toBeNull();

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);

            promisesWithRetrySpy.mockRestore();
        });

        it('should not dispatch and return non-null error when getMyChannels fails and channels are not already in state', async () => {
            const channelsInTeamValues = [
                null,
                {[`not-${team.id}`]: channels},
                {[team.id]: []},
            ];
            for (i = 0; i < channelsInTeamValues.length; i++) {
                const channelsInTeam = channelsInTeamValues[i];

                Client4.getMyChannels.mockImplementation(() => {throw new Error()});
                Client4.getMyChannelMembers.mockReturnValue(channelMembers);
                ChannelSelectors.getChannelsInTeam.mockReturnValueOnce(channelsInTeam);

                const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
                expect(result.error).not.toBeNull();

                const emptyActions = [];
                const actions = store.getActions();
                expect(actions).toStrictEqual(emptyActions);
            };
        });

        it('should not dispatch and return null error when getMyChannels fails and channels are already in state', async () => {
            const channelsInTeam = {[team.id]: channels};

            Client4.getMyChannels.mockImplementation(() => {throw new Error()});
            Client4.getMyChannelMembers.mockReturnValue(channelMembers);
            ChannelSelectors.getChannelsInTeam.mockReturnValueOnce(channelsInTeam);

            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result.error).toBeNull();

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should not dispatch and return non-null error when getMyChannelMembers fails and channels are not already in state', async () => {
            const channelsInTeamValues = [
                null,
                {[`not-${team.id}`]: channels},
                {[team.id]: []},
            ];
            for (i = 0; i < channelsInTeamValues.length; i++) {
                const channelsInTeam = channelsInTeamValues[i];

                Client4.getMyChannels.mockReturnValue(channels);
                Client4.getMyChannelMembers.mockImplementation(() => {throw new Error()});
                ChannelSelectors.getChannelsInTeam.mockReturnValueOnce(channelsInTeam);

                const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
                expect(result.error).not.toBeNull();

                const emptyActions = [];
                const actions = store.getActions();
                expect(actions).toStrictEqual(emptyActions);
            }
        });

        it('should not dispatch and return null error when getMyChannelMembers fails and channels are already in state', async () => {
            const channelsInTeam = {[team.id]: channels};

            Client4.getMyChannels.mockReturnValue(channels);
            Client4.getMyChannelMembers.mockImplementation(() => {throw new Error()});
            ChannelSelectors.getChannelsInTeam.mockReturnValueOnce(channelsInTeam);

            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result.error).toBeNull();

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should not dispatch and return empty data when no channels', async () => {
            GeneralActionHelpers.promisesWithRetry = jest.fn().
                mockReturnValueOnce({data: [[], channelMembers]});

            const expectedResult = {data: {channels: [], channelMembers}};
            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should only dispatch receivedMyChannelsWithMembers, loadDirectMessages, and loadUnreadChannelPosts when channels but no members', async () => {
            GeneralActionHelpers.promisesWithRetry = jest.fn().
                mockReturnValueOnce({data: [channels, []]});

            const expectedResult = {data: {channels, channelMembers: []}};
            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedMyChannelsWithMembers(channels, []),
                ], 'BATCH_GET_MY_CHANNELS_FOR_TEAM'),
                ChannelHighOrderActions.loadDirectMessages(channels, []),
                PostViewsHighOrderActions.loadUnreadChannelPosts(channels, []),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should only dispatch loadDirectMessages and loadUnreadChannelPosts when channels and members but skipBatchDispatch is true', async () => {
            GeneralActionHelpers.promisesWithRetry = jest.fn().
                mockReturnValueOnce({data: [channels, channelMembers]});

            const expectedResult = {data: {channels, channelMembers}};
            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id, skipBatchDispatch=true));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelHighOrderActions.loadDirectMessages(channels, channelMembers),
                PostViewsHighOrderActions.loadUnreadChannelPosts(channels, channelMembers),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should also dispatch receivedRoles when channelMembers have roles and Client4.getRolesByNames succeeds', async () => {
            const membersWithRoles = channelMembers.map((member, index) => ({
                ...member,
                roles: `dupe-role test-role-${index} ${member.roles}`,
            }));
            const roleSet = new Set();
            for (const member of membersWithRoles) {
                for (const role of member.roles.split(' ')) {
                    roleSet.add(role);
                }
            }
            const roles = Array.from(roleSet);

            GeneralActionHelpers.promisesWithRetry = jest.fn().
                mockReturnValueOnce({data: [channels, membersWithRoles]});
            Client4.getRolesByNames.mockReturnValueOnce(roles);

            const expectedResult = {data: {channels, channelMembers: membersWithRoles, roles}};
            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);
            expect(Client4.getRolesByNames).toHaveBeenCalledWith(roles);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedMyChannelsWithMembers(channels, membersWithRoles),
                    RoleActions.receivedRoles(roles),
                ], 'BATCH_GET_MY_CHANNELS_FOR_TEAM'),
                ChannelHighOrderActions.loadDirectMessages(channels, membersWithRoles),
                PostViewsHighOrderActions.loadUnreadChannelPosts(channels, membersWithRoles),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch receivedRoles when Client4.getRolesByNames fails', async () => {
            const membersWithRoles = channelMembers.map((member, index) => ({
                ...member,
                roles: `dupe-role test-role-${index} ${member.roles}`,
            }));
            const roleSet = new Set();
            for (const member of membersWithRoles) {
                for (const role of member.roles.split(' ')) {
                    roleSet.add(role);
                }
            }
            const roles = Array.from(roleSet);

            GeneralActionHelpers.promisesWithRetry = jest.fn().
                mockReturnValueOnce({data: [channels, membersWithRoles]});
            Client4.getRolesByNames.mockImplementationOnce(() => {throw new Error()});

            const expectedResult = {data: {channels, channelMembers: membersWithRoles}};
            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);
            expect(Client4.getRolesByNames).toHaveBeenCalledWith(roles);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedMyChannelsWithMembers(channels, membersWithRoles),
                ], 'BATCH_GET_MY_CHANNELS_FOR_TEAM'),
                ChannelHighOrderActions.loadDirectMessages(channels, membersWithRoles),
                PostViewsHighOrderActions.loadUnreadChannelPosts(channels, membersWithRoles),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch receivedRoles when Client4.getRolesByNames returns empty array', async () => {
            const membersWithRoles = channelMembers.map((member, index) => ({
                ...member,
                roles: `dupe-role test-role-${index} ${member.roles}`,
            }));
            const roleSet = new Set();
            for (const member of membersWithRoles) {
                for (const role of member.roles.split(' ')) {
                    roleSet.add(role);
                }
            }
            const roles = Array.from(roleSet);

            GeneralActionHelpers.promisesWithRetry = jest.fn().
                mockReturnValueOnce({data: [channels, membersWithRoles]});
            Client4.getRolesByNames.mockReturnValueOnce([]);

            const expectedResult = {data: {channels, channelMembers: membersWithRoles}};
            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);
            expect(Client4.getRolesByNames).toHaveBeenCalledWith(roles);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedMyChannelsWithMembers(channels, membersWithRoles),
                ], 'BATCH_GET_MY_CHANNELS_FOR_TEAM'),
                ChannelHighOrderActions.loadDirectMessages(channels, membersWithRoles),
                PostViewsHighOrderActions.loadUnreadChannelPosts(channels, membersWithRoles),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch receivedRoles when members have no roles', async () => {
            const membersWithoutRoles = channelMembers.map((member) => ({
                ...member,
                roles: '',
            }));

            GeneralActionHelpers.promisesWithRetry = jest.fn().
                mockReturnValueOnce({data: [channels, membersWithoutRoles]});

            const expectedResult = {data: {channels, channelMembers: membersWithoutRoles}};
            const result = await store.dispatch(Actions.getMyChannelsAndMembersForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);
            expect(Client4.getRolesByNames).not.toHaveBeenCalled();

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedMyChannelsWithMembers(channels, membersWithoutRoles),
                ], 'BATCH_GET_MY_CHANNELS_FOR_TEAM'),
                ChannelHighOrderActions.loadDirectMessages(channels, membersWithoutRoles),
                PostViewsHighOrderActions.loadUnreadChannelPosts(channels, membersWithoutRoles),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getChannel', () => {
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getChannel = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch channelsFailure when Client4.getChannel throws error', async () => {
            Client4.getChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getChannel(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannel).toHaveBeenCalledWith(channel.id);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.channelsFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.getChannel succeeds', async () => {
            Client4.getChannel.mockReturnValueOnce(channel);

            const expectedResult = {data: channel};
            const result = await store.dispatch(Actions.getChannel(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.receivedChannel(channel),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getChannelByNameAndTeamName', () => {
        const team = TestHelper.fakeTeam();
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getChannelByNameAndTeamName = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch channelsFailure when Client4.getChannelByNameAndTeamName throws error', async () => {
            Client4.getChannelByNameAndTeamName.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getChannelByNameAndTeamName(team.name, channel.name));
            expect(result.error).toBeDefined();
            expect(Client4.getChannelByNameAndTeamName).toHaveBeenCalledWith(team.name, channel.name, includeDeleted=false);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.channelsFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.getChannelByNameAndTeamName succeeds', async () => {
            Client4.getChannelByNameAndTeamName.mockReturnValueOnce(channel);

            const expectedResult = {data: channel};
            const result = await store.dispatch(Actions.getChannelByNameAndTeamName(team.name, channel.name));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.receivedChannel(channel),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getChannelAndMyMember', () => {
        const channel = TestHelper.fakeChannel();
        const member = TestHelper.fakeChannelMember();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getChannel = jest.fn();
            Client4.getMyChannelMember = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
            RoleActions.loadRolesIfNeeded = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-roles'));
        });

        it('should dispatch channelsFailure when Client4.getChannel throws error', async () => {
            Client4.getChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getChannelAndMyMember(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannel).toHaveBeenCalledWith(channel.id);
            expect(Client4.getMyChannelMember).not.toHaveBeenCalled();

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.channelsFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch channelsFailure when Client4.getMyChannelMember throws error', async () => {
            Client4.getChannel.mockReturnValueOnce(channel);
            Client4.getMyChannelMember.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getChannelAndMyMember(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannel).toHaveBeenCalledWith(channel.id);
            expect(Client4.getMyChannelMember).toHaveBeenCalledWith(channel.id);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.channelsFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when both Client4.getChannel and Client4.getMyChannelMember succeed', async () => {
            Client4.getChannel.mockReturnValueOnce(channel);
            Client4.getMyChannelMember.mockReturnValueOnce(member);

            const expectedResult = {data: {channel, member}};
            const result = await store.dispatch(Actions.getChannelAndMyMember(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(channel),
                    ChannelActionObjects.receivedMyChannelMember(member),
                ]),
                RoleActions.loadRolesIfNeeded(member.roles.split(' ')),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getChannelTimezones', () => {
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getChannelTimezones = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch logError when Client4.getChannelTimezones throws error', async () => {
            Client4.getChannelTimezones.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getChannelTimezones(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannelTimezones).toHaveBeenCalledWith(channel.id);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch when Client4.getChannelTimezones succeeds', async () => {
            const timezones = ['timezone-1', 'timezone-2'];
            Client4.getChannelTimezones.mockReturnValueOnce(timezones);

            const expectedResult = {data: timezones};
            const result = await store.dispatch(Actions.getChannelTimezones(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];

            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });
    });

    describe('getChannelStats', () => {
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getChannelStats = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch logError when Client4.getChannelStats throws error', async () => {
            Client4.getChannelStats.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getChannelStats(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannelStats).toHaveBeenCalledWith(channel.id);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.getChannelStats succeeds', async () => {
            const stats = {
                channel_id: channel.id,
                member_count: 10,
                pinnedpost_count: 0,
            };
            Client4.getChannelStats.mockReturnValueOnce(stats);

            const expectedResult = {data: stats};
            const result = await store.dispatch(Actions.getChannelStats(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.receivedChannelStats(stats),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getChannelMembers', () => {
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getChannelMembers = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
            UserActions.getMissingProfilesByIds = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('get-missing-profiles'));
        });

        it('should dispatch logError when Client4.getChannelMembers throws error', async () => {
            Client4.getChannelMembers.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getChannelMembers(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannelMembers).toHaveBeenCalledWith(channel.id, page=0, perPage=General.CHANNELS_CHUNK_SIZE);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.getChannelMembers succeeds', async () => {
            const channelMembers = [
                TestHelper.fakeChannelMember(),
                TestHelper.fakeChannelMember(),
            ];
            Client4.getChannelMembers.mockReturnValueOnce(channelMembers);

            const expectedResult = {data: channelMembers};
            const result = await store.dispatch(Actions.getChannelMembers(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedUserIds = channelMembers.map((member) => member.user_id);
            const expectedActions = [
                UserActions.getMissingProfilesByIds(expectedUserIds),
                ChannelActionObjects.receivedChannelMembers(channelMembers),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getMyChannelMember', () => {
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getMyChannelMember = jest.fn();
        });

        it('should not dispatch when Client4.getMyChannelMember throws error', async () => {
            Client4.getMyChannelMember.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getMyChannelMember(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.getMyChannelMember).toHaveBeenCalledWith(channel.id);

            const emptyActions = [];

            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should dispatch when Client4.getMyChannelMember succeeds', async () => {
            const channelMember = TestHelper.fakeChannelMember();
            Client4.getMyChannelMember.mockReturnValueOnce(channelMember);

            const expectedResult = {data: channelMember};
            const result = await store.dispatch(Actions.getMyChannelMember(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.receivedMyChannelMember(channelMember),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('getMyChannelMembers', () => {
        const team = TestHelper.fakeTeam();
        const currentUser = TestHelper.fakeUser();
        const channels = [
            TestHelper.fakeChannel(),
            TestHelper.fakeChannel(),
        ];
        const channelIds = channels.map((channel) => channel.id);

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getMyChannelMembers = jest.fn();
            CommonSelectors.getCurrentUserId = jest.fn().mockReturnValue(currentUser.id);
            ChannelUtils.getChannelsIdForTeam = jest.fn().mockReturnValue(channelIds);

            RoleActions.loadRolesIfNeeded = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-roles'));
            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch logError when Client4.getMyChannelMembers throws error', async () => {
            Client4.getMyChannelMembers.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.getMyChannelMembers(team.id));
            expect(result.error).toBeDefined();
            expect(Client4.getMyChannelMembers).toHaveBeenCalledWith(team.id);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch receivedMyChannelMembers and loadRolesIfNeeded when Client4.getMyChannelMembers succeeds', async () => {
            const channelMembers = [
                TestHelper.fakeChannelMember(),
                TestHelper.fakeChannelMember(),
            ];
            Client4.getMyChannelMembers.mockReturnValueOnce(channelMembers);

            const expectedResult = {data: channelMembers};
            const result = await store.dispatch(Actions.getMyChannelMembers(team.id));
            expect(result).toStrictEqual(expectedResult);

            const roles = new Set();
            for (const member of channelMembers) {
                for (const role of member.roles.split(' ')) {
                    roles.add(role);
                }
            }
            const expectedActions = [
                ChannelActionObjects.receivedMyChannelMembers(channelMembers, channelIds, currentUser.id),
                RoleActions.loadRolesIfNeeded(roles),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch loadRolesIfNeeded if roles is empty', async () => {
            const channelMembers = [
                {
                    ...TestHelper.fakeChannelMember(),
                    roles: '',
                },
                {
                    ...TestHelper.fakeChannelMember(),
                    roles: '',
                }
            ];
            Client4.getMyChannelMembers.mockReturnValueOnce(channelMembers);

            const expectedResult = {data: channelMembers};
            const result = await store.dispatch(Actions.getMyChannelMembers(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.receivedMyChannelMembers(channelMembers, channelIds, currentUser.id),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('patchChannel', () => {
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.patchChannel = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch updateChannelFailure when Client4.patchChannel throws error', async () => {
            Client4.patchChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.patchChannel(channel.id, channel));
            expect(result.error).toBeDefined();
            expect(Client4.patchChannel).toHaveBeenCalledWith(channel.id, channel);

            const expectedActions = [
                ChannelActionObjects.updateChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.updateChannelFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.patchChannel succeeds', async () => {
            Client4.patchChannel.mockReturnValueOnce(channel);

            const expectedResult = {data: channel};
            const result = await store.dispatch(Actions.patchChannel(channel.id, channel));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.updateChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(channel),
                    ChannelActionObjects.updateChannelSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('updateChannel', () => {
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.updateChannel = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch updateChannelFailure when Client4.updateChannel throws error', async () => {
            Client4.updateChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.updateChannel(channel));
            expect(result.error).toBeDefined();
            expect(Client4.updateChannel).toHaveBeenCalledWith(channel);

            const expectedActions = [
                ChannelActionObjects.updateChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.updateChannelFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.updateChannel succeeds', async () => {
            Client4.updateChannel.mockReturnValueOnce(channel);

            const expectedResult = {data: channel};
            const result = await store.dispatch(Actions.updateChannel(channel));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.updateChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(channel),
                    ChannelActionObjects.updateChannelSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('updateChannelPrivacy', () => {
        const channel = TestHelper.fakeChannel();
        const privacy = 'privacy';

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.updateChannelPrivacy = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch updateChannelFailure when Client4.updateChannelPrivacy throws error', async () => {
            Client4.updateChannelPrivacy.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.updateChannelPrivacy(channel.id, privacy));
            expect(result.error).toBeDefined();
            expect(Client4.updateChannelPrivacy).toHaveBeenCalledWith(channel.id, privacy);

            const expectedActions = [
                ChannelActionObjects.updateChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.updateChannelFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.updateChannelPrivacy succeeds', async () => {
            Client4.updateChannelPrivacy.mockReturnValueOnce(channel);

            const expectedResult = {data: channel};
            const result = await store.dispatch(Actions.updateChannelPrivacy(channel.id, privacy));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.updateChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(channel),
                    ChannelActionObjects.updateChannelSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('updateChannelNotifyProps', () => {
        const user = TestHelper.fakeUser();
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.updateChannelNotifyProps = jest.fn();
            ChannelSelectors.getMyChannelMember = jest.fn();
            ChannelUtils.notifyPropsChanged = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch logError when Client4.updateChannelNotifyProps throws error', async () => {
            Client4.updateChannelNotifyProps.mockImplementationOnce(() => {throw new Error()});

            const props = {};
            const result = await store.dispatch(Actions.updateChannelNotifyProps(user.id, channel.id, props));
            expect(result.error).toBeDefined();

            const notifyProps = {
                user_id: user.id,
                channel_id: channel.id,
                ...props,
            }
            expect(Client4.updateChannelNotifyProps).toHaveBeenCalledWith(notifyProps);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch when notify props have not changed', async () => {
            const props = {};
            ChannelUtils.notifyPropsChanged.mockReturnValueOnce(false)

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.updateChannelNotifyProps(user.id, channel.id, props));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];

            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should dispatch receivedChannelProps when notify props have changed', async () => {
            const props = {
                'desktop': 'on',
            };
            const channelMember = {
                ...TestHelper.fakeChannelMember,
                notify_props: {
                    'desktop': 'off',
                    'email': 'on',
                },
            }
            ChannelUtils.notifyPropsChanged.mockReturnValueOnce(true);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(channelMember);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.updateChannelNotifyProps(user.id, channel.id, props));
            expect(result).toStrictEqual(expectedResult);

            expectedNewProps = {
                ...channelMember.notify_props,
                user_id: user.id,
                channel_id: channel.id,
                ...props,
            };
            const expectedActions = [
                ChannelActionObjects.receivedChannelProps(channel.id, expectedNewProps),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('convertChannelToPrivate', () => {
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.convertChannelToPrivate = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch updateChannelFailure when Client4.convertChannelToPrivate throws error', async () => {
            Client4.convertChannelToPrivate.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.convertChannelToPrivate(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.convertChannelToPrivate).toHaveBeenCalledWith(channel.id);

            const expectedActions = [
                ChannelActionObjects.updateChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.updateChannelFailure(result.error),
                    ErrorActions.logError(result.error),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch when Client4.convertChannelToPrivate succeeds', async () => {
            Client4.convertChannelToPrivate.mockReturnValueOnce(channel);

            const expectedResult = {data: channel};
            const result = await store.dispatch(Actions.convertChannelToPrivate(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.updateChannelRequest(),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(channel),
                    ChannelActionObjects.updateChannelSuccess(),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('unarchiveChannel', () => {
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.unarchiveChannel = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch logError when Client4.unarchiveChannel throws error', async () => {
            Client4.unarchiveChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.unarchiveChannel(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.unarchiveChannel).toHaveBeenCalledWith(channel.id);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch when Client4.unarchiveChannel succeeds', async () => {
            Client4.unarchiveChannel.mockReturnValueOnce(channel);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.unarchiveChannel(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];

            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });
    });

    describe('markChannelAsRead', () => {
        const channel = TestHelper.fakeChannel();
        const prevChannel = TestHelper.fakeChannel();
        const channelMember = TestHelper.fakeChannelMember();
        const prevChannelMember = TestHelper.fakeChannelMember();

        beforeEach(() => {
            jest.restoreAllMocks();

            ChannelSelectors.isManuallyUnread = jest.fn();
            Client4.viewMyChannel = jest.fn().mockResolvedValue();
        });

        it('calls Client4.viewMyChannel by default', async () => {
            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            expect(Client4.viewMyChannel).toHaveBeenCalled();
        });

        it('does not call Client4.viewMyChannel if updateLastViewedAt if false', async () => {
            const updateLastViewedAt = false;

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(channel.id, prevChannel.id, updateLastViewedAt));
            expect(result).toStrictEqual(expectedResult);

            expect(Client4.viewMyChannel).not.toHaveBeenCalled();
        });

        it('calls Client4.viewMyChannel without prevChannelId if previous channel is manually unread', async () => {
            ChannelSelectors.isManuallyUnread.mockReturnValueOnce(true);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            expect(Client4.viewMyChannel).toHaveBeenCalledWith(channel.id, '');
        });

        it('calls Client4.viewMyChannel with prevChannelId if previous channel is not manually unread', async () => {
            ChannelSelectors.isManuallyUnread.mockReturnValueOnce(false);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            expect(Client4.viewMyChannel).toHaveBeenCalledWith(channel.id, prevChannel.id);
        });

        it('does not dispatch when no channel and no member', async () => {
            ChannelSelectors.getChannel.mockReturnValueOnce(null);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(null);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('does not dispatch when no channel and no member', async () => {
            ChannelSelectors.getChannel.mockReturnValueOnce(null);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(null);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('does not dispatch if channel but no member', async () => {
            ChannelSelectors.getChannel.mockReturnValueOnce(channel);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(null);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should only dispatch removeManuallyUnread if manually unread channel', async () => {
            ChannelSelectors.getChannel.mockReturnValueOnce(channel);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(null);
            ChannelSelectors.isManuallyUnread.mockReturnValue(true);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.removeManuallyUnread(channel.id),
                ]),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch decrementUnreadMessageCount and decrementUnreadMentionCount when channel and member', async () => {
            ChannelSelectors.getChannel.mockReturnValueOnce(channel);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(channelMember);
            ChannelSelectors.isManuallyUnread.mockReturnValue(false);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(channel.id, prevChannel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.decrementUnreadMessageCount(channel, channel.total_msg_count - channelMember.msg_count),
                    ChannelActionObjects.decrementUnreadMentionCount(channel, channelMember.mention_count),
                ]),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch decrementUnreadMessageCount and decrementUnreadMentionCount for both channel and prevChannel', async () => {
            const chann = {
                ...channel,
                total_msg_count: 20,
            };
            const member = {
                ...channelMember,
                msg_count: 10,
                mention_count: 5,
            };

            const prevChann = {
                ...prevChannel,
                total_msg_count: 2 * chann.total_msg_count,
            };
            const prevMember = {
                ...prevChannelMember,
                msg_count: 2 * member.msg_count,
                mention_count: 2 * member.mention_count,
            };
            
            ChannelSelectors.getChannel.
                mockReturnValueOnce(chann).
                mockReturnValueOnce(prevChann);
            ChannelSelectors.getMyChannelMember.
                mockReturnValueOnce(member).
                mockReturnValueOnce(prevMember);
            ChannelSelectors.isManuallyUnread.mockReturnValue(false);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.markChannelAsRead(chann.id, prevChann.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.decrementUnreadMessageCount(chann, chann.total_msg_count - member.msg_count),
                    ChannelActionObjects.decrementUnreadMentionCount(chann, member.mention_count),
                    ChannelActionObjects.decrementUnreadMessageCount(prevChann, prevChann.total_msg_count - prevMember.msg_count),
                    ChannelActionObjects.decrementUnreadMentionCount(prevChann, prevMember.mention_count),
                ]),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('addChannelMember', () => {
        const channel = TestHelper.fakeChannel();
        const user = TestHelper.fakeUser();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.addToChannel = jest.fn();
            Client4.trackEvent = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
            UserActions.receivedProfileInChannel = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('received-profile-in-channel'));
        });

        it('should dispatch logError when Client4.addToChannel throws error', async () => {
            Client4.addToChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.addChannelMember(channel.id, user.id));
            expect(result.error).toBeDefined();
            expect(Client4.addToChannel).toHaveBeenCalledWith(user.id, channel.id, postRootId='');

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch and track event when Client4.addToChannel succeeds', async () => {
            const channelMember = TestHelper.fakeChannelMember();
            Client4.addToChannel.mockReturnValueOnce(channelMember);

            const expectedResult = {data: channelMember};
            const result = await store.dispatch(Actions.addChannelMember(channel.id, user.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    UserActions.receivedProfileInChannel(channel.id, user.id),
                    ChannelActionObjects.receivedChannelMember(channelMember),
                    ChannelActionObjects.addChannelMemberSuccess(channel.id),
                ], 'ADD_CHANNEL_MEMBER.BATCH'),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const expectedCategory = 'action';
            const expectedEvent = 'action_channels_add_member';
            const expectedEventData = {channel_id: channel.id};
            expect(Client4.trackEvent).toHaveBeenCalledWith(expectedCategory, expectedEvent, expectedEventData);
        });
    });

    describe('removeChannelMember', () => {
        const channel = TestHelper.fakeChannel();
        const user = TestHelper.fakeUser();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.removeFromChannel = jest.fn();
            Client4.trackEvent = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
            UserActions.receivedProfileNotInChannel = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('received-profile-in-channel'));
        });

        it('should dispatch logError when Client4.removeFromChannel throws error', async () => {
            Client4.removeFromChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.removeChannelMember(channel.id, user.id));
            expect(result.error).toBeDefined();
            expect(Client4.removeFromChannel).toHaveBeenCalledWith(user.id, channel.id);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch and track event when Client4.removeFromChannel succeeds', async () => {
            const channelMember = TestHelper.fakeChannelMember();
            Client4.removeFromChannel.mockReturnValueOnce(channelMember);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.removeChannelMember(channel.id, user.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    UserActions.receivedProfileNotInChannel(channel.id, user.id),
                    ChannelActionObjects.removeChannelMemberSuccess(channel.id),
                ], 'REMOVE_CHANNEL_MEMBER.BATCH'),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const expectedCategory = 'action';
            const expectedEvent = 'action_channels_remove_member';
            const expectedEventData = {channel_id: channel.id};
            expect(Client4.trackEvent).toHaveBeenCalledWith(expectedCategory, expectedEvent, expectedEventData);
        });
    });

    describe('joinChannelById', () => {
        const channel = TestHelper.fakeChannel();
        const user = TestHelper.fakeUser();
        const member = TestHelper.fakeChannelMember();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.addToChannel = jest.fn();
            Client4.getChannel = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
            RoleActions.loadRolesIfNeeded = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-roles'));
        });

        it('should dispatch logError when Client4.addToChannel throws error', async () => {
            Client4.addToChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.joinChannelById(channel.id, user.id));
            expect(result.error).toBeDefined();
            expect(Client4.addToChannel).toHaveBeenCalledWith(user.id, channel.id);
            expect(Client4.getChannel).not.toHaveBeenCalled();

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch logError when Client4.getChannel throws error', async () => {
            Client4.addToChannel.mockReturnValueOnce(member);
            Client4.getChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.joinChannelById(channel.id, user.id));
            expect(result.error).toBeDefined();
            expect(Client4.addToChannel).toHaveBeenCalledWith(user.id, channel.id);
            expect(Client4.getChannel).toHaveBeenCalledWith(channel.id);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch and track event when both Client4.addToChannel and Client4.getChannel succeed', async () => {
            Client4.addToChannel.mockReturnValueOnce(member);
            Client4.getChannel.mockReturnValueOnce(channel);

            const expectedResult = {data: {channel, member}};
            const result = await store.dispatch(Actions.joinChannelById(channel.id, user.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(channel),
                    ChannelActionObjects.receivedMyChannelMember(member),
                ]),
                RoleActions.loadRolesIfNeeded(member.roles.split(' ')),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const expectedCategory = 'action';
            const expectedEvent = 'action_channels_join';
            const expectedEventData = {channel_id: channel.id};
            expect(Client4.trackEvent).toHaveBeenCalledWith(expectedCategory, expectedEvent, expectedEventData);
        });
    });

    describe('joinChannelByName', () => {
        const team = TestHelper.fakeTeam();
        const channel = TestHelper.fakeChannel();
        const user = TestHelper.fakeUser();
        const member = TestHelper.fakeChannelMember();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.getChannelByName = jest.fn();
            Client4.getChannelMember = jest.fn();
            Client4.addToChannel = jest.fn();
            ChannelUtils.isGroupChannel = jest.fn();
            ChannelUtils.isDirectChannel = jest.fn();

            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
            RoleActions.loadRolesIfNeeded = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-roles'));
        });

        it('should dispatch logError when Client4.getChannelByName throws error', async () => {
            Client4.getChannelByName.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.joinChannelByName(channel.name, team.id, user.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannelByName).toHaveBeenCalledWith(team.id, channel.name, includeDeleted=true);
            expect(Client4.getChannelMember).not.toHaveBeenCalled();
            expect(Client4.addToChannel).not.toHaveBeenCalled();

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch logError when Client4.getChannelMember throws error', async () => {
            Client4.getChannelByName.mockReturnValueOnce(channel);
            Client4.getChannelMember.mockImplementationOnce(() => {throw new Error()});
            ChannelUtils.isGroupChannel.mockReturnValueOnce(true);

            const result = await store.dispatch(Actions.joinChannelByName(channel.name, team.id, user.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannelByName).toHaveBeenCalledWith(team.id, channel.name, includeDeleted=true);
            expect(Client4.getChannelMember).toHaveBeenCalledWith(channel.id, user.id);
            expect(Client4.addToChannel).not.toHaveBeenCalled();

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch logError when Client4.getChannelMember throws error', async () => {
            Client4.getChannelByName.mockReturnValueOnce(channel);
            Client4.getChannelMember.mockImplementationOnce(() => {throw new Error()});
            ChannelUtils.isGroupChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(true);

            const result = await store.dispatch(Actions.joinChannelByName(channel.name, team.id, user.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannelByName).toHaveBeenCalledWith(team.id, channel.name, includeDeleted=true);
            expect(Client4.getChannelMember).toHaveBeenCalledWith(channel.id, user.id);
            expect(Client4.addToChannel).not.toHaveBeenCalled();

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch logError when Client4.addToChannel throws error', async () => {
            Client4.getChannelByName.mockReturnValueOnce(channel);
            Client4.addToChannel.mockImplementationOnce(() => {throw new Error()});
            ChannelUtils.isGroupChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(false);

            const result = await store.dispatch(Actions.joinChannelByName(channel.name, team.id, user.id));
            expect(result.error).toBeDefined();
            expect(Client4.getChannelByName).toHaveBeenCalledWith(team.id, channel.name, includeDeleted=true);
            expect(Client4.getChannelMember).not.toHaveBeenCalled();
            expect(Client4.addToChannel).toHaveBeenCalledWith(user.id, channel.id);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch and track event when Client4.getChannelMember succeeds for group or direct channel', async () => {
            const isGroupValues = [true, false];
            isGroupValues.forEach(async (isGroup) => {
                Client4.getChannelByName.mockReturnValueOnce(channel);
                Client4.getChannelMember.mockReturnValueOnce(member);
                if (isGroup) {
                    ChannelUtils.isGroupChannel.mockReturnValueOnce(true);
                } else {
                    ChannelUtils.isGroupChannel.mockReturnValueOnce(false);
                    ChannelUtils.isDirectChannel.mockReturnValueOnce(true);
                }

                const expectedResult = {data: {channel, member}};
                const result = await store.dispatch(Actions.joinChannelByName(channel.name, team.id, user.id));
                expect(result).toStrictEqual(expectedResult);
                expect(Client4.getChannelByName).toHaveBeenCalled();
                expect(Client4.getChannelMember).toHaveBeenCalled();
                expect(Client4.addToChannel).not.toHaveBeenCalled();

                const expectedActions = [
                    TestHelper.buildBatchAction([
                        ChannelActionObjects.receivedChannel(channel),
                        ChannelActionObjects.receivedMyChannelMember(member),
                    ]),
                    RoleActions.loadRolesIfNeeded(member.roles.split(' ')),
                ];

                const actions = store.getActions();
                expect(actions).toStrictEqual(expectedActions);

                const expectedCategory = 'action';
                const expectedEvent = 'action_channels_join';
                const expectedEventData = {channel_id: channel.id};
                expect(Client4.trackEvent).toHaveBeenCalledWith(expectedCategory, expectedEvent, expectedEventData);
            });
        });

        it('should dispatch and track event when Client4.addToChannel succeeds', async () => {
            Client4.getChannelByName.mockReturnValueOnce(channel);
            Client4.addToChannel.mockReturnValueOnce(member);
            ChannelUtils.isGroupChannel.mockReturnValueOnce(false);
            ChannelUtils.isDirectChannel.mockReturnValueOnce(false);

            const expectedResult = {data: {channel, member}};
            const result = await store.dispatch(Actions.joinChannelByName(channel.name, team.id, user.id));
            expect(result).toStrictEqual(expectedResult);
            expect(Client4.getChannelByName).toHaveBeenCalled();
            expect(Client4.addToChannel).toHaveBeenCalled();
            expect(Client4.getChannelMember).not.toHaveBeenCalled();

            const expectedActions = [
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(channel),
                    ChannelActionObjects.receivedMyChannelMember(member),
                ]),
                RoleActions.loadRolesIfNeeded(member.roles.split(' ')),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const expectedCategory = 'action';
            const expectedEvent = 'action_channels_join';
            const expectedEventData = {channel_id: channel.id};
            expect(Client4.trackEvent).toHaveBeenCalledWith(expectedCategory, expectedEvent, expectedEventData);
        });
    });

    describe('deleteChannel', () => {
        const team = TestHelper.fakeTeam();
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.deleteChannel = jest.fn();
            GeneralSelectors.getConfig = jest.fn();
            CommonSelectors.getCurrentChannelId = jest.fn();
            TeamSelectors.getCurrentTeamId = jest.fn();

            ChannelSelectionActions.selectRedirectChannelForTeam = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('select-redirect-channel'));
            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch logError when Client4.deleteChannel throws error', async () => {
            Client4.deleteChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.deleteChannel(channel.id));
            expect(result.error).toBeDefined();
            expect(Client4.deleteChannel).toHaveBeenCalledWith(channel.id);

            const expectedActions = [
                ErrorActions.logError(result.error),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch deleteChannelSuccess when Client4.deleteChannel succeeds', async () => {
            Client4.deleteChannel.mockReturnValueOnce(channel.id);
            GeneralSelectors.getConfig.mockReturnValueOnce({});

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.deleteChannel(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.deleteChannelSuccess(channel.id, viewArchivedChannels=false),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch selectRedirectChannelForTeam when current channel is deleted but can view archived channels', async () => {
            Client4.deleteChannel.mockReturnValueOnce(channel.id);
            GeneralSelectors.getConfig.mockReturnValueOnce({ExperimentalViewArchivedChannels: 'true'});
            CommonSelectors.getCurrentChannelId.mockReturnValueOnce(channel.id);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.deleteChannel(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.deleteChannelSuccess(channel.id, viewArchivedChannels=true),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should dispatch selectRedirectChannelForTeam when current channel is deleted and cannot view archived channels', async () => {
            Client4.deleteChannel.mockReturnValueOnce(channel.id);
            GeneralSelectors.getConfig.mockReturnValueOnce({ExperimentalViewArchivedChannels: 'false'});
            CommonSelectors.getCurrentChannelId.mockReturnValueOnce(channel.id);
            TeamSelectors.getCurrentTeamId.mockReturnValueOnce(team.id);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.deleteChannel(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelSelectionActions.selectRedirectChannelForTeam(team.id),
                ChannelActionObjects.deleteChannelSuccess(channel.id, viewArchivedChannels=false),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should not dispatch selectRedirectChannelForTeam when can view archived channels but current channel was not deleted', async () => {
            Client4.deleteChannel.mockReturnValueOnce(channel.id);
            GeneralSelectors.getConfig.mockReturnValueOnce({ExperimentalViewArchivedChannels: 'true'});
            CommonSelectors.getCurrentChannelId.mockReturnValueOnce(`not-${channel.id}`);
            TeamSelectors.getCurrentTeamId.mockReturnValueOnce(team.id);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.deleteChannel(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelActionObjects.deleteChannelSuccess(channel.id, viewArchivedChannels=true),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });

    describe('removeMeFromChannel', () => {
        const channel = TestHelper.fakeChannel();
        const channelMember = TestHelper.fakeChannelMember();
        const currentTeam = TestHelper.fakeTeam();
        const currentUser = TestHelper.fakeUser();

        beforeEach(() => {
            jest.restoreAllMocks();

            Client4.removeFromChannel = jest.fn();
            Client4.trackEvent = jest.fn();
            CommonSelectors.getCurrentChannelId = jest.fn();
            ChannelSelectors.getMyChannelMember = jest.fn().mockReturnValue(channelMember);
            TeamSelectors.getCurrentTeamId = jest.fn().mockReturnValue(currentTeam.id);
            CommonSelectors.getCurrentUserId = jest.fn().mockReturnValue(currentUser.id);

            ChannelSelectionActions.selectRedirectChannelForTeam = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('select-redirect-channel'));
            ErrorActions.logError = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('log-error'));
        });

        it('should dispatch removeLastChannelForTeam, leaveChannel, and track event when Client4.removeFromChannel succeeds', async () => {
            Client4.removeFromChannel.mockReturnValue();

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.removeMeFromChannel(channel));
            expect(result).toStrictEqual(expectedResult);
            expect(Client4.removeFromChannel).toHaveBeenCalledWith(currentUser.id, channel.id);

            const expectedActions = [
                ChannelViewsActions.removeLastChannelForTeam(currentTeam.id, channel.id),
                ChannelActionObjects.leaveChannel(channel, currentUser.id),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const expectedCategory = 'action';
            const expectedEvent = 'action_channels_leave';
            const expectedEventData = {channel_id: channel.id};
            expect(Client4.trackEvent).toHaveBeenCalledWith(expectedCategory, expectedEvent, expectedEventData);
        });

        it('should also dispatch receivedChannel and receivedMyChannelMember when Client4.removeFromChannel throws error', async () => {
            Client4.removeFromChannel.mockImplementationOnce(() => {throw new Error()});

            const result = await store.dispatch(Actions.removeMeFromChannel(channel));
            expect(result.error).toBeDefined();

            const expectedActions = [
                ChannelViewsActions.removeLastChannelForTeam(currentTeam.id, channel.id),
                ChannelActionObjects.leaveChannel(channel, currentUser.id),
                TestHelper.buildBatchAction([
                    ChannelActionObjects.receivedChannel(channel),
                    ChannelActionObjects.receivedMyChannelMember(channelMember),
                ]),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should also dispatch selectRedirectChannelForTeam when removal from current channel', async () => {
            Client4.removeFromChannel.mockReturnValue();
            CommonSelectors.getCurrentChannelId.mockReturnValueOnce(channel.id);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.removeMeFromChannel(channel));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelViewsActions.removeLastChannelForTeam(currentTeam.id, channel.id),
                ChannelSelectionActions.selectRedirectChannelForTeam(currentTeam.id),
                ChannelActionObjects.leaveChannel(channel, currentUser.id),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });

        it('should also dispatch selectRedirectChannelForTeam when not removal from current channel but reset is true', async () => {
            Client4.removeFromChannel.mockReturnValue();

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.removeMeFromChannel(channel, reset=true));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                ChannelViewsActions.removeLastChannelForTeam(currentTeam.id, channel.id),
                ChannelSelectionActions.selectRedirectChannelForTeam(currentTeam.id),
                ChannelActionObjects.leaveChannel(channel, currentUser.id),
            ];

            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);
        });
    });
});