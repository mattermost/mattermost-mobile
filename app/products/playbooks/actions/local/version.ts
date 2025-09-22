// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import EphemeralStore from '@store/ephemeral_store';

import type {MyChannelModel} from '@database/models/server';

export const setPlaybooksVersion = async (serverUrl: string, version: string) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION,
                value: version,
            }],
            prepareRecordsOnly: false,
        });

        if (version === '') {
            const {error} = await purgePlaybooks(serverUrl);
            if (error) {
                return {error};
            }

            EphemeralStore.clearChannelPlaybooksSynced(serverUrl);
        }

        return {data: true};
    } catch (error) {
        return {error};
    }
};

const purgePlaybooks = async (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const models = await database.collections.get<MyChannelModel>(MM_TABLES.SERVER.MY_CHANNEL).query(Q.where('last_playbook_runs_fetch_at', Q.gt(0)));

        await database.write(async () => {
            await database.adapter.unsafeExecute({
                sqls: [
                    [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_RUN}`, []],
                    [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST}`, []],
                    [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM}`, []],
                ],
            });

            // Process each model sequentially to prevent overwhelming the event loop with excessive promises
            // and to avoid overloading the database with concurrent write operations, especially when handling a large number of channels.
            for await (const model of models) {
                await model.update((channel) => {
                    channel.lastPlaybookRunsFetchAt = 0;
                    return channel;
                });
            }
        });
    } catch (error) {
        return {error};
    }

    return {data: true};
};
