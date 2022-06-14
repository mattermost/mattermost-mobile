// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@app/constants/database';
import {resetWebSocketLastDisconnected} from '@app/queries/servers/system';
import {popToRoot} from '@app/screens/navigation';
import DatabaseManager from '@database/manager';

const {
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    THREAD,
    THREADS_IN_TEAM,
    THREAD_PARTICIPANT,
    MY_CHANNEL,
} = MM_TABLES.SERVER;

export async function resetAfterCRTChange(serverUrl: string, isSameServer: boolean): Promise<{error: any}> {
    const operator = DatabaseManager.serverDatabases?.[serverUrl].operator;

    if (!operator) {
        return {error: 'No App database found'};
    }
    const database = operator.database;

    try {
        await database.write(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return database.adapter.unsafeExecute({
                sqls: [
                    [`DELETE FROM ${POST}`, []],
                    [`DELETE FROM ${POSTS_IN_CHANNEL}`, []],
                    [`DELETE FROM ${POSTS_IN_THREAD}`, []],
                    [`DELETE FROM ${THREAD}`, []],
                    [`DELETE FROM ${THREADS_IN_TEAM}`, []],
                    [`DELETE FROM ${THREAD_PARTICIPANT}`, []],
                    [`DELETE FROM ${MY_CHANNEL}`, []],
                ],
            });
        });

        await resetWebSocketLastDisconnected(operator);
        if (isSameServer) {
            popToRoot();
        }
    } catch (error) {
        if (__DEV__) {
            throw error;
        }
        return {error};
    }

    return {error: false};
}
