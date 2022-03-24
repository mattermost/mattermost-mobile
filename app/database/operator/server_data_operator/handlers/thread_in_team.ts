// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {transformThreadInTeamRecord} from '@database/operator/server_data_operator/transformers/thread';
import {getRawRecordPairs} from '@database/operator/utils/general';

import type {HandleThreadInTeamArgs} from '@typings/database/database';
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

        const create: ThreadInTeam[] = [];
        const teamIds = Object.keys(threadsMap);
        for await (const teamId of teamIds) {
            const chunks = await (this.database as Database).get<ThreadInTeamModel>(THREADS_IN_TEAM).query(
                Q.where('team_id', teamId),
            ).fetch();

            for (const thread of threadsMap[teamId]) {
                const exists = chunks.some((threadInTeam) => {
                    return threadInTeam.threadId === thread.id;
                });

                if (!exists) {
                    // create chunk
                    create.push({
                        thread_id: thread.id,
                        team_id: teamId,
                    });
                }
            }
        }

        const threadsInTeam = (await this.prepareRecords({
            createRaws: getRawRecordPairs(create),
            updateRaws: [],
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
