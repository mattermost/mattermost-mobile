// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {entryInitialLoad as mockEntryInitialLoadImport} from '@actions/remote/entry/initial_load';
import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {prepareThreadsFromReceivedPosts} from '@queries/servers/thread';
import {NavigationStore} from '@store/navigation_store';
import {mockApiClient} from '@test/mock_api_client';
import TestHelper from '@test/test_helper';

import {pushNotificationEntry} from './notification';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@managers/performance_metrics_manager');
jest.mock('@store/navigation_store');

jest.mock('@actions/remote/entry/initial_load');
const mockEntryInitialLoad = jest.mocked(mockEntryInitialLoadImport);

const mockDismissKeyboard = jest.fn();
jest.mock('@utils/keyboard', () => ({
    dismissKeyboard: (...args: unknown[]) => mockDismissKeyboard(...args),
}));

const mockedNavigationStore = jest.mocked(NavigationStore);

describe('Performance metrics are set correctly', () => {
    const serverUrl = 'http://www.someserverurl.com';
    let operator: ServerDataOperator;
    let post: Post;
    beforeAll(() => {
        mockApiClient.get.mockImplementation((url: string) => {
            if (url.match(/\/api\/v4\/channels\/[a-z1-90-]*\/posts/)) {
                return {status: 200, ok: true, data: {order: [], posts: {}}};
            }
            if (url.match(/\/api\/v4\/channels\/[a-z1-90-]*\/stats/)) {
                return {status: 200, ok: true, data: {}};
            }
            if (url.match(/\/api\/v4\/posts\/[a-z1-90-]*\/thread/)) {
                return {status: 200, ok: true, data: {order: [], posts: {}}};
            }
            console.log(`GET ${url} not registered in the mock`);
            return {status: 404, ok: false};
        });

        mockApiClient.post.mockImplementation((url: string) => {
            if (url.match(/\/api\/v4\/channels\/members\/me\/view/)) {
                return {status: 200, ok: true, data: {}};
            }

            console.log(`POST ${url} not registered in the mock`);
            return {status: 404, ok: false};
        });
        mockedNavigationStore.waitUntilScreenIsTop.mockImplementation(() => Promise.resolve());

        // There are no problems when running the tests for this file alone without this line
        // but for some reason, when running several tests together, it fails if we don't add this.
        mockedNavigationStore.getScreensInStack.mockImplementation(() => []);
    });
    afterAll(() => {
        mockApiClient.get.mockReset();
        mockApiClient.post.mockReset();
    });

    beforeEach(async () => {
        const client = await NetworkManager.createClient(serverUrl);
        expect(client).toBeTruthy();
        operator = (await TestHelper.setupServerDatabase(serverUrl)).operator;
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });
        const threadModels = await prepareThreadsFromReceivedPosts(operator, [post], true);
        await operator.batchRecords(threadModels, 'test');
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(serverUrl);
    });

    it('channel notification', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'CollapsedThreads', value: 'default_on'},
                {id: 'FeatureFlagCollapsedThreads', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        await pushNotificationEntry(serverUrl, {
            channel_id: TestHelper.basicChannel!.id,
            team_id: TestHelper.basicTeam!.id,
            isCRTEnabled: false, // isCRTEnabled is not checked at this level
            post_id: '', // Post ID is not checked at this level
            type: '', // Type is not checked at this level
            version: '', // Version is not checked at this level
        });

        expect(mockDismissKeyboard).toHaveBeenCalled();
        expect(PerformanceMetricsManager.setLoadTarget).toHaveBeenCalledWith('CHANNEL');
    });

    it('thread notification', async () => {
        const commentPost = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, root_id: post.id});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [commentPost.id],
            posts: [commentPost],
            prepareRecordsOnly: false,
        });
        const threadModels = await prepareThreadsFromReceivedPosts(operator, [commentPost], true);
        await operator.batchRecords(threadModels, 'test');
        await operator.handleConfigs({
            configs: [
                {id: 'CollapsedThreads', value: 'default_on'},
                {id: 'FeatureFlagCollapsedThreads', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        await pushNotificationEntry(serverUrl, {
            root_id: post.id,
            channel_id: TestHelper.basicChannel!.id,
            team_id: TestHelper.basicTeam!.id,
            isCRTEnabled: false, // isCRTEnabled is not checked at this level
            post_id: '', // Post ID is not checked at this level
            type: '', // Type is not checked at this level
            version: '', // Version is not checked at this level
        });

        expect(PerformanceMetricsManager.setLoadTarget).toHaveBeenCalledWith('THREAD');
    });

    it('thread notification with wrong root id', async () => {
        const commentPost = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, root_id: post.id});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [commentPost.id],
            posts: [commentPost],
            prepareRecordsOnly: false,
        });
        const threadModels = await prepareThreadsFromReceivedPosts(operator, [commentPost], true);
        await operator.batchRecords(threadModels, 'test');
        await operator.handleConfigs({
            configs: [
                {id: 'CollapsedThreads', value: 'default_on'},
                {id: 'FeatureFlagCollapsedThreads', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        await pushNotificationEntry(serverUrl, {
            root_id: commentPost.id,
            channel_id: TestHelper.basicChannel!.id,
            team_id: TestHelper.basicTeam!.id,
            isCRTEnabled: false, // isCRTEnabled is not checked at this level
            post_id: '', // Post ID is not checked at this level
            type: '', // Type is not checked at this level
            version: '', // Version is not checked at this level
        });

        expect(PerformanceMetricsManager.setLoadTarget).toHaveBeenCalledWith('THREAD');
    });

    it('thread notification with non crt', async () => {
        const commentPost = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, root_id: post.id});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [commentPost.id],
            posts: [commentPost],
            prepareRecordsOnly: false,
        });
        const threadModels = await prepareThreadsFromReceivedPosts(operator, [commentPost], true);
        await operator.batchRecords(threadModels, 'test');
        await operator.handleConfigs({
            configs: [
                {id: 'CollapsedThreads', value: 'disabled'},
                {id: 'FeatureFlagCollapsedThreads', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        await pushNotificationEntry(serverUrl, {
            root_id: post.id,
            channel_id: TestHelper.basicChannel!.id,
            team_id: TestHelper.basicTeam!.id,
            isCRTEnabled: false, // isCRTEnabled is not checked at this level
            post_id: '', // Post ID is not checked at this level
            type: '', // Type is not checked at this level
            version: '', // Version is not checked at this level
        });

        expect(PerformanceMetricsManager.setLoadTarget).toHaveBeenCalledWith('CHANNEL');
    });
});

describe('pushNotificationEntry — ExperienceAPI sync path', () => {
    const serverUrl = 'http://www.someserverurl.com';
    let operator: ServerDataOperator;

    beforeEach(async () => {
        const client = await NetworkManager.createClient(serverUrl);
        expect(client).toBeTruthy();
        operator = (await TestHelper.setupServerDatabase(serverUrl)).operator;
        await DatabaseManager.setActiveServerDatabase(serverUrl);

        // Seed FeatureFlagEnableExperienceAPI so pushNotificationEntry enables the flag.
        await operator.handleConfigs({
            configs: [{id: 'FeatureFlagEnableExperienceAPI', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        mockedNavigationStore.waitUntilScreenIsTop.mockImplementation(() => Promise.resolve());
        mockedNavigationStore.getScreensInStack.mockImplementation(() => []);
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(serverUrl);
    });

    it('calls entryInitialLoad instead of individual fetches when ExperienceAPI is enabled and data is missing', async () => {
        // Use IDs not in the DB so both myTeam and myChannel are missing.
        const missingTeamId = 'missing-team-id';
        const missingChannelId = 'missing-channel-id';

        mockEntryInitialLoad.mockResolvedValueOnce({
            models: [],
            initialTeamId: missingTeamId,
            initialChannelId: missingChannelId,
            prefData: {preferences: []},
            teamData: {teams: [], memberships: []},
            gmConverted: false,
        });

        await pushNotificationEntry(serverUrl, {
            channel_id: missingChannelId,
            team_id: missingTeamId,
            isCRTEnabled: false,
            post_id: '',
            type: '',
            version: '',
        }, 'Notification');

        expect(mockEntryInitialLoad).toHaveBeenCalledWith(
            serverUrl,
            missingTeamId,
            missingChannelId,
            undefined,
            undefined,
            'Notification',
        );
    });

    it('calls entryInitialLoad and returns gracefully when it fails', async () => {
        mockEntryInitialLoad.mockResolvedValueOnce({error: 'network failure'});

        const result = await pushNotificationEntry(serverUrl, {
            channel_id: 'missing-channel-id',
            team_id: 'missing-team-id',
            isCRTEnabled: false,
            post_id: '',
            type: '',
            version: '',
        });

        // Error is emitted and WS is opened, but {} is returned (not the error itself).
        expect(result).toBeDefined();
        expect(mockEntryInitialLoad).toHaveBeenCalled();
    });
});
