// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {transformThreadInTeamRecord} from '@database/operator/server_data_operator/transformers/thread';
import {getRawRecordPairs, getValidRecordsForUpdate} from '@database/operator/utils/general';

import type {HandleThreadInTeamArgs, RecordPair} from '@typings/database/database';
import type ThreadInTeamModel from '@typings/database/models/servers/thread_in_team';

export interface ThreadInTeamHandlerMix {
    handleThreadInTeam: ({threadsMap, prepareRecordsOnly}: HandleThreadInTeamArgs) => Promise<ThreadInTeamModel[]>;
}

const {THREADS_IN_TEAM} = MM_TABLES.SERVER;

const ThreadInTeamHandler = (superclass: any) => class extends superclass {
    handleThreadInTeam = async ({threadsMap, prepareRecordsOnly = false}: HandleThreadInTeamArgs): Promise<ThreadInTeamModel[]> => {
        if (!Object.keys(threadsMap).length) {
            return [];
        }

        const update: RecordPair[] = [];
        const create: ThreadInTeam[] = [];
        const teamIds = Object.keys(threadsMap);
        for await (const teamId of teamIds) {
            const chunks = await (this.database as Database).get<ThreadInTeamModel>(THREADS_IN_TEAM).query(
                Q.where('team_id', teamId),
            ).fetch();

            for (const thread of threadsMap[teamId]) {
                const chunk = chunks.find((threadInTeam) => {
                    return threadInTeam.threadId === thread.id;
                });

                const newValue = {
                    thread_id: thread.id,
                    team_id: teamId,
                    loaded_in_global_threads: thread.loaded_in_global_threads,
                };

                // update record if loaded_in_global_threads is true
                if (chunk && thread.loaded_in_global_threads) {
                    update.push(getValidRecordsForUpdate({
                        tableName: THREADS_IN_TEAM,
                        newValue,
                        existingRecord: chunk,
                    }));
                } else {
                    // create chunk
                    create.push(newValue);
                }
            }
        }

        const threadsInTeam = (await this.prepareRecords({
            createRaws: getRawRecordPairs(create),
            updateRaws: update,
            transformer: transformThreadInTeamRecord,
            tableName: THREADS_IN_TEAM,
        })) as ThreadInTeamModel[];

        if (threadsInTeam?.length && !prepareRecordsOnly) {
            await this.batchRecords(threadsInTeam);
        }

        return threadsInTeam;
    };
};

export default ThreadInTeamHandler;
