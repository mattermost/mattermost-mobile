// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Tutorial} from '@constants';
import {GLOBAL_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl} from '@init/credentials';
import {logError} from '@utils/log';

export const storeGlobal = async (id: string, value: unknown, prepareRecordsOnly = false) => {
    try {
        const {operator} = DatabaseManager.getAppDatabaseAndOperator();
        return operator.handleGlobal({
            globals: [{id, value}],
            prepareRecordsOnly,
        });
    } catch (error) {
        logError('storeGlobal', error);
        return {error};
    }
};

export const storeDeviceToken = async (token: string, prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.DEVICE_TOKEN, token, prepareRecordsOnly);
};

export const storeOnboardingViewedValue = async (value = true) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.ONBOARDING, value, false);
};

export const storeMultiServerTutorial = async (prepareRecordsOnly = false) => {
    return storeGlobal(Tutorial.MULTI_SERVER, 'true', prepareRecordsOnly);
};

export const storeProfileLongPressTutorial = async (prepareRecordsOnly = false) => {
    return storeGlobal(Tutorial.PROFILE_LONG_PRESS, 'true', prepareRecordsOnly);
};

export const storeSkinEmojiSelectorTutorial = async (prepareRecordsOnly = false) => {
    return storeGlobal(Tutorial.EMOJI_SKIN_SELECTOR, 'true', prepareRecordsOnly);
};

export const storeDraftsTutorial = async () => {
    return storeGlobal(Tutorial.DRAFTS, 'true', false);
};

export const storeScheduledPostTutorial = async () => {
    return storeGlobal(Tutorial.SCHEDULED_POST, 'true', false);
};

export const storeScheduledPostsListTutorial = async () => {
    return storeGlobal(Tutorial.SCHEDULED_POSTS_LIST, 'true', false);
};

export const storeDontAskForReview = async (prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.DONT_ASK_FOR_REVIEW, 'true', prepareRecordsOnly);
};

export const storeLastAskForReview = async (prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.LAST_ASK_FOR_REVIEW, Date.now(), prepareRecordsOnly);
};

export const storeFirstLaunch = async (prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.FIRST_LAUNCH, Date.now(), prepareRecordsOnly);
};

export const storeLastViewedChannelIdAndServer = async (channelId: string) => {
    const currentServerUrl = await getActiveServerUrl();

    return storeGlobal(GLOBAL_IDENTIFIERS.LAST_VIEWED_CHANNEL, {
        server_url: currentServerUrl,
        channel_id: channelId,
    }, false);
};

export const storeLastViewedThreadIdAndServer = async (threadId: string) => {
    const currentServerUrl = await getActiveServerUrl();

    return storeGlobal(GLOBAL_IDENTIFIERS.LAST_VIEWED_THREAD, {
        server_url: currentServerUrl,
        thread_id: threadId,
    }, false);
};

export const removeLastViewedChannelIdAndServer = async () => {
    return storeGlobal(GLOBAL_IDENTIFIERS.LAST_VIEWED_CHANNEL, null, false);
};

export const removeLastViewedThreadIdAndServer = async () => {
    return storeGlobal(GLOBAL_IDENTIFIERS.LAST_VIEWED_THREAD, null, false);
};

export const storePushDisabledInServerAcknowledged = async (serverUrl: string) => {
    return storeGlobal(`${GLOBAL_IDENTIFIERS.PUSH_DISABLED_ACK}${serverUrl}`, 'true', false);
};

export const removePushDisabledInServerAcknowledged = async (serverUrl: string) => {
    return storeGlobal(`${GLOBAL_IDENTIFIERS.PUSH_DISABLED_ACK}${serverUrl}`, null, false);
};
