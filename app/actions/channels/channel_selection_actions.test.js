// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import en from 'assets/i18n/en.json';

import EventEmitter from '@mm-redux/utils/event_emitter';

import * as TeamSelectors from '@mm-redux/selectors/entities/teams';
import * as ChannelSelectors from '@mm-redux/selectors/entities/channels';
import * as CommonSelectors from '@mm-redux/selectors/entities/common';
import * as ViewSelectors from '@selectors/views';

import * as TeamActions from '@mm-redux/actions/teams';
import * as PostViewsHighOrderActions from '@actions/views/post/high_order_actions';
import * as ChannelActionObjects from '@actions/channels/action_objects';
import * as ChannelActionHelpers from '@actions/helpers/channels';

import * as UserUtils from '@utils/users';

import TestHelper from 'test/test_helper';

import * as Actions from './channel_selection_actions';

describe('Actions.Channel.ChannelSelectionActions', () => {
    let store;
    const createMockStore = configureStore([thunk]);

    beforeEach(() => {
        store = createMockStore({});
    });

    describe('handleSelectChannel', () => {
        const channel = TestHelper.fakeChannel();
        const channelMember = TestHelper.fakeChannelMember();

        beforeEach(() => {
            jest.restoreAllMocks();

            CommonSelectors.getCurrentChannelId = jest.fn();
            ChannelSelectors.getChannel = jest.fn();
            ChannelSelectors.getMyChannelMember = jest.fn();
            TeamSelectors.getCurrentTeamId = jest.fn();

            PostViewsHighOrderActions.loadPostsIfNecessaryWithRetry = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('load-posts'));
            ChannelActionObjects.selectChannel = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('select-channel'));
            ChannelActionHelpers.markChannelAsViewedAndReadActions = jest.fn().
                mockReturnValue([{type: 'action-1'}, {type: 'action-2'}]);
        });

        it ('should not dispatch when current channel is selected', async () => {
            CommonSelectors.getCurrentChannelId.mockReturnValueOnce(channel.id);

            const expectedResult = {data: false};
            const result = await store.dispatch(Actions.handleSelectChannel(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should only dispatch loadPostsIfNecessaryWithRetry when channel is not found', async () => {
            ChannelSelectors.getChannel.mockReturnValueOnce(null);

            const expectedResult = {data: false};
            const result = await store.dispatch(Actions.handleSelectChannel(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                PostViewsHighOrderActions.loadPostsIfNecessaryWithRetry(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            expect(PostViewsHighOrderActions.loadPostsIfNecessaryWithRetry).toBeCalledWith(channel.id);
        });

        it('should also dispatch markChannelAsViewedAndReadActions and selectChannel when channel is found', async () => {
            ChannelSelectors.getChannel.mockReturnValueOnce(channel);
            const currentChannelId = `not-${channel.id}`;
            CommonSelectors.getCurrentChannelId.mockReturnValueOnce(currentChannelId);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(channelMember);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.handleSelectChannel(channel.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                PostViewsHighOrderActions.loadPostsIfNecessaryWithRetry(),
                TestHelper.buildBatchAction([
                    ...ChannelActionHelpers.markChannelAsViewedAndReadActions(),
                    ChannelActionObjects.selectChannel(),
                ], 'BATCH_SWITCH_CHANNEL'),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            const expectedExtra = {
                channel,
                member: channelMember,
                teamId: channel.team_id,
            };
            expect(PostViewsHighOrderActions.loadPostsIfNecessaryWithRetry).toBeCalledWith(channel.id);
            expect(ChannelActionHelpers.markChannelAsViewedAndReadActions).toHaveBeenCalledWith(state, channel.id, currentChannelId);
            expect(ChannelActionObjects.selectChannel).toHaveBeenCalledWith(channel.id, expectedExtra);
        });

        it('should use currentTeamId in extra when channel does not have a team ID', async () => {
            const currentTeamId = TestHelper.generateId();
            const channelWithoutTeam = {
                ...channel,
                team_id: '',
            };
            ChannelSelectors.getChannel.mockReturnValueOnce(channelWithoutTeam);
            const currentChannelId = `not-${channelWithoutTeam.id}`;
            CommonSelectors.getCurrentChannelId.mockReturnValueOnce(currentChannelId);
            ChannelSelectors.getMyChannelMember.mockReturnValueOnce(channelMember);
            TeamSelectors.getCurrentTeamId.mockReturnValueOnce(currentTeamId);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.handleSelectChannel(channelWithoutTeam.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                PostViewsHighOrderActions.loadPostsIfNecessaryWithRetry(),
                TestHelper.buildBatchAction([
                    ...ChannelActionHelpers.markChannelAsViewedAndReadActions(),
                    ChannelActionObjects.selectChannel(),
                ], 'BATCH_SWITCH_CHANNEL'),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            const expectedExtra = {
                channel: channelWithoutTeam,
                member: channelMember,
                teamId: currentTeamId,
            };
            expect(PostViewsHighOrderActions.loadPostsIfNecessaryWithRetry).toBeCalledWith(channelWithoutTeam.id);
            expect(ChannelActionHelpers.markChannelAsViewedAndReadActions).toHaveBeenCalledWith(state, channelWithoutTeam.id, currentChannelId);
            expect(ChannelActionObjects.selectChannel).toHaveBeenCalledWith(channelWithoutTeam.id, expectedExtra);
        });
    });

    describe('selectRedirectChannelForTeam', () => {
        const team = TestHelper.fakeTeam();
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            ChannelSelectors.getRedirectChannelForTeam = jest.fn();
            EventEmitter.emit = jest.fn();

            Actions.handleSelectChannel = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('handle-select-channel'));
        });

        it('should emit event and return mobile.default_channel.error when channel not found', async () => {
            ChannelSelectors.getRedirectChannelForTeam.mockReturnValueOnce(null);

            const {error} = await store.dispatch(Actions.selectRedirectChannelForTeam(team.id));
            expect(error.defaultMessage).toEqual(en['mobile.default_channel.error']);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);

            const state = store.getState();
            expect(ChannelSelectors.getRedirectChannelForTeam).toHaveBeenCalledWith(state, team.id);
        });

        it('should dispatch handleSelectChannel when channel found', async () => {
            ChannelSelectors.getRedirectChannelForTeam.mockReturnValueOnce(channel);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectRedirectChannelForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                Actions.handleSelectChannel(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ChannelSelectors.getRedirectChannelForTeam).toHaveBeenCalledWith(state, team.id);
            expect(Actions.handleSelectChannel).toHaveBeenCalledWith(channel.id);
        });
    });

    describe('selectChannelFromDeepLinkMatch', () => {
        const team = TestHelper.fakeTeam();
        const teamChannel = TestHelper.fakeChannelWithTeamId(team.id);
        const nonTeamChannel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            TeamSelectors.getTeamByName = jest.fn();
            TeamSelectors.getCurrentTeamId = jest.fn();
            ChannelSelectors.getChannelByName = jest.fn();
            CommonSelectors.getCurrentChannelId = jest.fn();

            Actions.handleSelectChannel = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('handle-select-channel'));
            TeamActions.selectTeam = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('select-team'));
        });

        it('returns unreachable team error if team not found', async () => {
            TeamSelectors.getTeamByName.mockReturnValueOnce(null);

            const {error} = await store.dispatch(Actions.selectChannelFromDeepLinkMatch(teamChannel.name, team.name));
            expect(error.defaultMessage).toEqual(en['mobile.server_link.unreachable_team.error']);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);

            const state = store.getState();
            expect(TeamSelectors.getTeamByName).toHaveBeenCalledWith(state, team.name)
        });

        it('returns unreachable channel error if channel not found', async () => {
            TeamSelectors.getTeamByName.mockReturnValueOnce(team);
            ChannelSelectors.getChannelByName.mockReturnValueOnce(null);

            const {error} = await store.dispatch(Actions.selectChannelFromDeepLinkMatch(teamChannel.name, team.name));
            expect(error.defaultMessage).toEqual(en['mobile.server_link.unreachable_channel.error']);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);

            const state = store.getState();
            expect(ChannelSelectors.getChannelByName).toHaveBeenCalledWith(state, teamChannel.name)
        });

        it('returns server link error if channel does not belong to the team', async () => {
            TeamSelectors.getTeamByName.mockReturnValueOnce(team);
            ChannelSelectors.getChannelByName.mockReturnValueOnce(nonTeamChannel);

            const {error} = await store.dispatch(Actions.selectChannelFromDeepLinkMatch(nonTeamChannel.name, team.name));
            expect(error.defaultMessage).toEqual(en['mobile.server_link.error.text']);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should not dispatch actions for current channel', async () => {
            TeamSelectors.getTeamByName.mockReturnValueOnce(team);
            ChannelSelectors.getChannelByName.mockReturnValueOnce(teamChannel);
            CommonSelectors.getCurrentChannelId.mockReturnValueOnce(teamChannel.id)

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectChannelFromDeepLinkMatch(teamChannel.name, team.name));
            expect(result).toStrictEqual(expectedResult);

            const emptyActions = [];
            const actions = store.getActions();
            expect(actions).toStrictEqual(emptyActions);
        });

        it('should only dispatch handleSelectChannel when channel is in current team', async () => {
            TeamSelectors.getTeamByName.mockReturnValueOnce(team);
            TeamSelectors.getCurrentTeamId.mockReturnValueOnce(team.id);
            ChannelSelectors.getChannelByName.mockReturnValueOnce(teamChannel);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectChannelFromDeepLinkMatch(teamChannel.name, team.name));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                Actions.handleSelectChannel(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            expect(Actions.handleSelectChannel).toHaveBeenCalledWith(teamChannel.id);
        });

        it('should also dispatch selectTeam when channel is not in current team', async () => {
            TeamSelectors.getTeamByName.mockReturnValueOnce(team);
            TeamSelectors.getCurrentTeamId.mockReturnValueOnce(`not-${team.id}`);
            ChannelSelectors.getChannelByName.mockReturnValueOnce(teamChannel);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectChannelFromDeepLinkMatch(teamChannel.name, team.name));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                TeamActions.selectTeam(),
                Actions.handleSelectChannel(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            expect(TeamActions.selectTeam).toHaveBeenCalledWith(team);
            expect(Actions.handleSelectChannel).toHaveBeenCalledWith(teamChannel.id);
        });
    });

    describe('selectLastViewedChannelForTeam', () => {
        const team = TestHelper.fakeTeam();
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            ViewSelectors.getLastViewedChannelForTeam = jest.fn();
            UserUtils.canSelectChannel = jest.fn();

            Actions.handleSelectChannel = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('handle-select-channel'));
            Actions.selectRedirectChannelForTeam = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('select-redirect-channel'));
        });

        it('should dispatch selectRedirectChannelForTeam when last viewed channel not found', async () => {
            ViewSelectors.getLastViewedChannelForTeam.mockReturnValueOnce(null);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectLastViewedChannelForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                Actions.selectRedirectChannelForTeam(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ViewSelectors.getLastViewedChannelForTeam).toHaveBeenCalledWith(state, team.id);
            expect(Actions.selectRedirectChannelForTeam).toHaveBeenCalledWith(team.id);
        });

        it('should dispatch selectRedirectChannelForTeam when last viewed channel cannot be selected', async () => {
            ViewSelectors.getLastViewedChannelForTeam.mockReturnValueOnce(channel);
            UserUtils.canSelectChannel.mockReturnValueOnce(false);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectLastViewedChannelForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                Actions.selectRedirectChannelForTeam(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ViewSelectors.getLastViewedChannelForTeam).toHaveBeenCalledWith(state, team.id);
            expect(UserUtils.canSelectChannel).toHaveBeenCalledWith(state, channel);
            expect(Actions.selectRedirectChannelForTeam).toHaveBeenCalledWith(team.id);
        });

        it('should dispatch handleSelectChannel when last viewed channel can be selected', async () => {
            ViewSelectors.getLastViewedChannelForTeam.mockReturnValueOnce(channel);
            UserUtils.canSelectChannel.mockReturnValueOnce(true);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectLastViewedChannelForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                Actions.handleSelectChannel(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ViewSelectors.getLastViewedChannelForTeam).toHaveBeenCalledWith(state, team.id);
            expect(UserUtils.canSelectChannel).toHaveBeenCalledWith(state, channel);
            expect(Actions.handleSelectChannel).toHaveBeenCalledWith(channel.id);
        });
    });

    describe('selectPenultimateViewedChannelForTeam', () => {
        const team = TestHelper.fakeTeam();
        const channel = TestHelper.fakeChannel();

        beforeEach(() => {
            jest.restoreAllMocks();

            ViewSelectors.getPenultimateViewedChannelForTeam = jest.fn();
            UserUtils.canSelectChannel = jest.fn();

            Actions.handleSelectChannel = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('handle-select-channel'));
            Actions.selectRedirectChannelForTeam = jest.fn().
                mockImplementation(TestHelper.genMockActionFunc('select-redirect-channel'));
        });

        it('should dispatch selectRedirectChannelForTeam when penultimate viewed channel not found', async () => {
            ViewSelectors.getPenultimateViewedChannelForTeam.mockReturnValueOnce(null);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectPenultimateViewedChannelForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                Actions.selectRedirectChannelForTeam(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ViewSelectors.getPenultimateViewedChannelForTeam).toHaveBeenCalledWith(state, team.id);
            expect(Actions.selectRedirectChannelForTeam).toHaveBeenCalledWith(team.id);
        });

        it('should dispatch selectRedirectChannelForTeam when penultimate viewed channel cannot be selected', async () => {
            ViewSelectors.getPenultimateViewedChannelForTeam.mockReturnValueOnce(channel);
            UserUtils.canSelectChannel.mockReturnValueOnce(false);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectPenultimateViewedChannelForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                Actions.selectRedirectChannelForTeam(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ViewSelectors.getPenultimateViewedChannelForTeam).toHaveBeenCalledWith(state, team.id);
            expect(UserUtils.canSelectChannel).toHaveBeenCalledWith(state, channel);
            expect(Actions.selectRedirectChannelForTeam).toHaveBeenCalledWith(team.id);
        });

        it('should dispatch handleSelectChannel when penultimate viewed channel can be selected', async () => {
            ViewSelectors.getPenultimateViewedChannelForTeam.mockReturnValueOnce(channel);
            UserUtils.canSelectChannel.mockReturnValueOnce(true);

            const expectedResult = {data: true};
            const result = await store.dispatch(Actions.selectPenultimateViewedChannelForTeam(team.id));
            expect(result).toStrictEqual(expectedResult);

            const expectedActions = [
                Actions.handleSelectChannel(),
            ];
            const actions = store.getActions();
            expect(actions).toStrictEqual(expectedActions);

            const state = store.getState();
            expect(ViewSelectors.getPenultimateViewedChannelForTeam).toHaveBeenCalledWith(state, team.id);
            expect(UserUtils.canSelectChannel).toHaveBeenCalledWith(state, channel);
            expect(Actions.handleSelectChannel).toHaveBeenCalledWith(channel.id);
        });
    });
});
