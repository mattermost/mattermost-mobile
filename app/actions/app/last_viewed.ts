// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {LAST_VIEWED_CHANNEL_ID, LAST_VIEWED_THREAD_ID} from '@constants/last_viewed';
import DatabaseManager from '@database/manager';

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const setLastViewedChannel = async (channel_id: string) => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();

        await database.localStorage.set(LAST_VIEWED_CHANNEL_ID, channel_id);
    } catch (e) {
    // let it be
    }
};

export const setLastViewedThread = async (thread_id: string) => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();

        await database.localStorage.set(LAST_VIEWED_THREAD_ID, thread_id);
    } catch (e) {
    // let it be
    }
};

export const removeLastViewedChannel = async () => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();

        await database.localStorage.remove(LAST_VIEWED_CHANNEL_ID);
    } catch (e) {
        // let it be
    }
};

export const removeLastViewedThread = async () => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();

        await database.localStorage.remove(LAST_VIEWED_THREAD_ID);
    } catch (e) {
        // let it be
    }
};

export const getLastViewed = async () => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();

        const channel_id = await database.localStorage.get<string>('last_channel_id');
        const thread_id = await database.localStorage.get<string>('last_thread_id');

        return {
            channel_id: channel_id || null,
            thread_id: thread_id || null,
        };
    } catch (e) {
        return {
            channel_id: null,
            thread_id: null,
        };
    }
};
