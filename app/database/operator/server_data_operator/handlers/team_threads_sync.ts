// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {transformTeamThreadsSyncRecord} from '@database/operator/server_data_operator/transformers/thread';
import {getRawRecordPairs, getUniqueRawsBy, getValidRecordsForUpdate} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
import type {HandleTeamThreadsSyncArgs, RecordPair} from '@typings/database/database';
import type TeamThreadsSyncModel from '@typings/database/models/servers/team_threads_sync';

export interface TeamThreadsSyncHandlerMix {
    handleTeamThreadsSync: ({data, prepareRecordsOnly}: HandleTeamThreadsSyncArgs) => Promise<TeamThreadsSyncModel[]>;
}

const {TEAM_THREADS_SYNC} = MM_TABLES.SERVER;

const TeamThreadsSyncHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    handleTeamThreadsSync = async ({data, prepareRecordsOnly = false}: HandleTeamThreadsSyncArgs): Promise<TeamThreadsSyncModel[]> => {
        if (!data || !data.length) {
            logWarning(
                'An empty or undefined "data" array has been passed to the handleTeamThreadsSync method',
            );
            return [];
        }

        const uniqueRaws = getUniqueRawsBy({raws: data, key: 'id'}) as TeamThreadsSync[];
        const ids = uniqueRaws.map((item) => item.id);
        const chunks = await (this.database as Database).get<TeamThreadsSyncModel>(TEAM_THREADS_SYNC).query(
            Q.where('id', Q.oneOf(ids)),
        ).fetch();
        const chunksMap = chunks.reduce((result: Record<string, TeamThreadsSyncModel>, chunk) => {
            result[chunk.id] = chunk;
            return result;
        }, {});

        const create: TeamThreadsSync[] = [];
        const update: Array<RecordPair<TeamThreadsSyncModel, TeamThreadsSync>> = [];

        for await (const item of uniqueRaws) {
            const {id} = item;
            const chunk = chunksMap[id];
            if (chunk) {
                update.push(getValidRecordsForUpdate({
                    tableName: TEAM_THREADS_SYNC,
                    newValue: item,
                    existingRecord: chunk,
                }));
            } else {
                create.push(item);
            }
        }

        const models = await this.prepareRecords<TeamThreadsSyncModel, TeamThreadsSync>({
            createRaws: getRawRecordPairs(create),
            updateRaws: update,
            transformer: transformTeamThreadsSyncRecord,
            tableName: TEAM_THREADS_SYNC,
        });

        if (models?.length && !prepareRecordsOnly) {
            await this.batchRecords(models, 'handleTeamThreadsSync');
        }

        return models;
    };
};

export default TeamThreadsSyncHandler;
