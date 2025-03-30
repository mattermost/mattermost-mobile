// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Tutorial} from '@constants';
import DatabaseManager from '@database/manager';
import {
    getDeviceToken,
    getDontAskForReview,
    getFirstLaunch,
    getLastAskedForReview,
    getOnboardingViewed,
    getLastViewedChannelIdAndServer,
    getLastViewedThreadIdAndServer,
    getPushDisabledInServerAcknowledged,
    queryGlobalValue,
} from '@queries/app/global';

import {
    storeGlobal,
    storeDeviceToken,
    storeOnboardingViewedValue,
    storeMultiServerTutorial,
    storeProfileLongPressTutorial,
    storeSkinEmojiSelectorTutorial,
    storeDontAskForReview,
    storeLastAskForReview,
    storeFirstLaunch,
    storeLastViewedChannelIdAndServer,
    storeLastViewedThreadIdAndServer,
    removeLastViewedChannelIdAndServer,
    removeLastViewedThreadIdAndServer,
    storePushDisabledInServerAcknowledged,
    removePushDisabledInServerAcknowledged,
    storeScheduledPostTutorial,
    storeScheduledPostsListTutorial,
} from './global';

const serverUrl = 'server.test.com';

jest.mock('react-native-keychain', () => {
    const original = jest.requireActual('react-native-keychain');
    return {
        ...original,
        getAllInternetPasswordServers: jest.fn(() => Promise.resolve([serverUrl])),
    };
});

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

describe('/app/actions/app/global', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    test('storeDeviceToken', async () => {
        let storedValue = await getDeviceToken();
        expect(storedValue).toBe('');

        const inputValue = 'new-token';
        await storeDeviceToken(inputValue);

        storedValue = await getDeviceToken();
        expect(storedValue).toBe(inputValue);
    });

    test('storeOnboardingViewedValue', async () => {
        let storedValue = await getOnboardingViewed();
        expect(storedValue).toBe(false);

        await storeOnboardingViewedValue();
        storedValue = await getOnboardingViewed();
        expect(storedValue).toBe(true);

        await storeOnboardingViewedValue(false);
        storedValue = await getOnboardingViewed();
        expect(storedValue).toBe(false);
    });

    test('storeMultiServerTutorial', async () => {
        let records = await queryGlobalValue(Tutorial.MULTI_SERVER)?.fetch();
        expect(records?.[0]?.value).toBeUndefined();

        await storeMultiServerTutorial();
        records = await queryGlobalValue(Tutorial.MULTI_SERVER)?.fetch();
        expect(records?.[0]?.value).toBe(true);
    });

    test('storeProfileLongPressTutorial', async () => {
        let records = await queryGlobalValue(Tutorial.PROFILE_LONG_PRESS)?.fetch();
        expect(records?.[0]?.value).toBeUndefined();

        await storeProfileLongPressTutorial();
        records = await queryGlobalValue(Tutorial.PROFILE_LONG_PRESS)?.fetch();
        expect(records?.[0]?.value).toBe(true);
    });

    test('storeSkinEmojiSelectorTutorial', async () => {
        let records = await queryGlobalValue(Tutorial.EMOJI_SKIN_SELECTOR)?.fetch();
        expect(records?.[0]?.value).toBeUndefined();

        await storeSkinEmojiSelectorTutorial();
        records = await queryGlobalValue(Tutorial.EMOJI_SKIN_SELECTOR)?.fetch();
        expect(records?.[0]?.value).toBe(true);
    });

    test('storeDontAskForReview', async () => {
        let storedValue = await getDontAskForReview();
        expect(storedValue).toBe(false);

        await storeDontAskForReview();
        storedValue = await getDontAskForReview();
        expect(storedValue).toBe(true);
    });

    test('storeLastAskForReview', async () => {
        let storedValue = await getLastAskedForReview();
        expect(storedValue).toBe(0);

        await storeLastAskForReview();
        storedValue = await getLastAskedForReview();
        expect(storedValue).toBeCloseTo(Date.now(), -5);
    });

    test('storeFirstLaunch', async () => {
        let storedValue = await getFirstLaunch();
        expect(storedValue).toBe(0);

        await storeFirstLaunch();
        storedValue = await getFirstLaunch();
        expect(storedValue).toBeCloseTo(Date.now(), -5);
    });

    test('<store|remove>LastViewedChannelIdAndServer', async () => {
        let storedValue = await getLastViewedChannelIdAndServer();
        expect(storedValue).toBeUndefined();

        await storeLastViewedChannelIdAndServer('channel-id-1');
        storedValue = await getLastViewedChannelIdAndServer();
        expect(storedValue).toMatchObject({channel_id: 'channel-id-1', server_url: serverUrl});

        await removeLastViewedChannelIdAndServer();
        storedValue = await getLastViewedChannelIdAndServer();
        expect(storedValue).toBeUndefined();
    });

    test('<store|remove>LastViewedThreadIdAndServer', async () => {
        let storedValue = await getLastViewedThreadIdAndServer();
        expect(storedValue).toBeUndefined();

        await storeLastViewedThreadIdAndServer('thread-id-1');
        storedValue = await getLastViewedThreadIdAndServer();
        expect(storedValue).toMatchObject({thread_id: 'thread-id-1', server_url: serverUrl});

        await removeLastViewedThreadIdAndServer();
        storedValue = await getLastViewedThreadIdAndServer();
        expect(storedValue).toBeUndefined();
    });

    test('<store|remove>PushDisabledInServerAcknowledged', async () => {
        let storedValue = await getPushDisabledInServerAcknowledged(serverUrl);
        expect(storedValue).toBe(false);

        await storePushDisabledInServerAcknowledged(serverUrl);
        storedValue = await getPushDisabledInServerAcknowledged(serverUrl);
        expect(storedValue).toBe(true);

        await removePushDisabledInServerAcknowledged(serverUrl);
        storedValue = await getPushDisabledInServerAcknowledged(serverUrl);
        expect(storedValue).toBe(false);
    });

    test('storeGlobal catch error', async () => {
        delete DatabaseManager.appDatabase;

        const response = await storeGlobal('key', '');

        expect(response).toMatchObject({error: expect.any(Error)});

        // @ts-expect-error testing error message
        expect(response.error.message).toBe('App database not found');
    });

    test('storeScheduledPostTutorial', async () => {
        let records = await queryGlobalValue(Tutorial.SCHEDULED_POST)?.fetch();
        expect(records?.[0]?.value).toBeUndefined();

        await storeScheduledPostTutorial();
        records = await queryGlobalValue(Tutorial.SCHEDULED_POST)?.fetch();
        expect(records?.[0]?.value).toBe(true);
    });

    test('storeScheduledPostsListTutorial', async () => {
        let records = await queryGlobalValue(Tutorial.SCHEDULED_POSTS_LIST)?.fetch();
        expect(records?.[0]?.value).toBeUndefined();

        await storeScheduledPostsListTutorial();
        records = await queryGlobalValue(Tutorial.SCHEDULED_POSTS_LIST)?.fetch();
        expect(records?.[0]?.value).toBe(true);
    });
});
