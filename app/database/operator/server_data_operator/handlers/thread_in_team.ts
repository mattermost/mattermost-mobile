// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {transformThreadInTeamRecord} from '@database/operator/server_data_operator/transformers/thread';
import {getRawRecordPairs} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type {HandleThreadInTeamArgs} from '@typings/database/database';
import type ThreadInTeamModel from '@typings/database/models/servers/thread_in_team';

export interface ThreadInTeamHandlerMix {
    handleThreadInTeam: ({threadsMap, prepareRecordsOnly}: HandleThreadInTeamArgs) => Promise<ThreadInTeamModel[]>;
}

const {THREADS_IN_TEAM} = MM_TABLES.SERVER;

const ThreadInTeamHandler = (superclass: any) => class extends superclass {
    handleThreadInTeam = async ({threadsMap, prepareRecordsOnly = false}: HandleThreadInTeamArgs): Promise<ThreadInTeamModel[]> => {
        if (!threadsMap || !Object.keys(threadsMap).length) {
            logWarning(
                'An empty or undefined "threadsMap" object has been passed to the handleReceivedPostForChannel method',
            );
            return [];
        }

        const create: ThreadInTeam[] = [];
        const teamIds = Object.keys(threadsMap);
        for await (const teamId of teamIds) {
            const threadIds = threadsMap[teamId].map((thread) => thread.id);
            const chunks = await (this.database as Database).get<ThreadInTeamModel>(THREADS_IN_TEAM).query(
                Q.where('team_id', teamId),
                Q.where('id', Q.oneOf(threadIds)),
            ).fetch();
            const chunksMap = chunks.reduce((result: Record<string, ThreadInTeamModel>, chunk) => {
                result[chunk.threadId] = chunk;
                return result;
            }, {});

            for (const thread of threadsMap[teamId]) {
                const chunk = chunksMap[thread.id];

                // Create if the chunk is not found
                if (!chunk) {
                    create.push({
                        thread_id: thread.id,
                        team_id: teamId,
                    });
                }
            }
        }

        const threadsInTeam = (await this.prepareRecords({
            createRaws: getRawRecordPairs(create),
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
