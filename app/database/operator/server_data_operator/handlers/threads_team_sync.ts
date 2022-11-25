// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {transformThreadsTeamSyncRecord} from '@database/operator/server_data_operator/transformers/thread';
import {getRawRecordPairs, getUniqueRawsBy, getValidRecordsForUpdate} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type {HandleThreadsTeamSyncArgs, RecordPair} from '@typings/database/database';
import type ThreadsTeamSyncModel from '@typings/database/models/servers/threads_team_sync';

export interface ThreadsTeamSyncHandlerMix {
    handleThreadsTeamSync: ({data, prepareRecordsOnly}: HandleThreadsTeamSyncArgs) => Promise<ThreadsTeamSyncModel[]>;
}

const {THREADS_TEAM_SYNC} = MM_TABLES.SERVER;

const ThreadsTeamSyncHandler = (superclass: any) => class extends superclass {
    handleThreadsTeamSync = async ({data, prepareRecordsOnly = false}: HandleThreadsTeamSyncArgs): Promise<ThreadsTeamSyncModel[]> => {
        if (!data || !data.length) {
            logWarning(
                'An empty or undefined "data" object has been passed to the handleThreadsTeamSync method',
            );
            return [];
        }

        const uniqueRaws = getUniqueRawsBy({raws: data, key: 'id'}) as ThreadsTeamSync[];
        const ids = uniqueRaws.map((item) => item.id);
        const chunks = await (this.database as Database).get<ThreadsTeamSyncModel>(THREADS_TEAM_SYNC).query(
            Q.where('id', Q.oneOf(ids)),
        ).fetch();
        const chunksMap = chunks.reduce((result: Record<string, ThreadsTeamSyncModel>, chunk) => {
            result[chunk.id] = chunk;
            return result;
        }, {});

        const create: ThreadsTeamSync[] = [];
        const update: RecordPair[] = [];

        for await (const item of uniqueRaws) {
            const {id} = item;
            const chunk = chunksMap[id];
            if (chunk) {
                update.push(getValidRecordsForUpdate({
                    tableName: THREADS_TEAM_SYNC,
                    newValue: item,
                    existingRecord: chunk,
                }));
            } else {
                create.push(item);
            }
        }

        const models = (await this.prepareRecords({
            createRaws: getRawRecordPairs(create),
            updateRaws: update,
            transformer: transformThreadsTeamSyncRecord,
            tableName: THREADS_TEAM_SYNC,
        })) as ThreadsTeamSyncModel[];

        if (models?.length && !prepareRecordsOnly) {
            await this.batchRecords(models);
        }

        return models;
    };
};

export default ThreadsTeamSyncHandler;
