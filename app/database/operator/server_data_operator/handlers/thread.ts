// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {shouldUpdateThreadRecord} from '@database/operator/server_data_operator/comparators/thread';
import {
    transformThreadRecord,
    transformThreadParticipantRecord,
    transformThreadInTeamRecord,
} from '@database/operator/server_data_operator/transformers/thread';
import {getRawRecordPairs, getUniqueRawsBy} from '@database/operator/utils/general';
import {sanitizeThreadParticipants} from '@database/operator/utils/thread';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
import type Database from '@nozbe/watermelondb/Database';
import type Model from '@nozbe/watermelondb/Model';
import type {HandleThreadsArgs, HandleThreadParticipantsArgs, HandleThreadInTeamArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';
import type ThreadInTeamModel from '@typings/database/models/servers/thread_in_team';
import type ThreadParticipantModel from '@typings/database/models/servers/thread_participant';

const {
    THREAD,
    THREAD_PARTICIPANT,
    THREADS_IN_TEAM,
} = MM_TABLES.SERVER;

export interface ThreadHandlerMix {
    handleThreads: ({threads, teamId, prepareRecordsOnly}: HandleThreadsArgs) => Promise<Model[]>;
    handleThreadParticipants: ({threadsParticipants, prepareRecordsOnly}: HandleThreadParticipantsArgs) => Promise<ThreadParticipantModel[]>;
    handleThreadInTeam: ({threadsMap, prepareRecordsOnly}: HandleThreadInTeamArgs) => Promise<ThreadInTeamModel[]>;
}

const ThreadHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handleThreads: Handler responsible for the Create/Update operations occurring on the Thread table from the 'Server' schema
     * @param {HandleThreadsArgs} handleThreads
     * @param {Thread[]} handleThreads.threads
     * @param {boolean | undefined} handleThreads.prepareRecordsOnly
     * @returns {Promise<void>}
     */
    handleThreads = async ({threads, teamId, prepareRecordsOnly = false}: HandleThreadsArgs): Promise<Model[]> => {
        if (!threads?.length) {
            logWarning(
                'An empty or undefined "threads" array has been passed to the handleThreads method',
            );
            return [];
        }

        // Get unique threads in case they are duplicated
        const uniqueThreads = getUniqueRawsBy({
            raws: threads,
            key: 'id',
        }) as ThreadWithLastFetchedAt[];

        // Seperate threads to be deleted & created/updated
        const deletedThreadIds: string[] = [];
        const createOrUpdateThreads: ThreadWithLastFetchedAt[] = [];
        uniqueThreads.forEach((thread) => {
            if (thread.delete_at > 0) {
                deletedThreadIds.push(thread.id);
            } else {
                createOrUpdateThreads.push(thread);
            }
        });

        if (deletedThreadIds.length) {
            const database: Database = this.database;
            const threadsToDelete = await database.get<ThreadModel>(THREAD).query(Q.where('id', Q.oneOf(deletedThreadIds))).fetch();
            if (threadsToDelete.length) {
                await database.write(async () => {
                    const promises: Array<Promise<void>> = [];
                    threadsToDelete.forEach((thread) => {
                        promises.push(thread.destroyPermanently());
                        promises.push(thread.threadsInTeam.destroyAllPermanently());
                        promises.push(thread.participants.destroyAllPermanently());
                    });
                    await Promise.all(promises);
                });
            }
        }

        // As there are no threads to be created or updated
        if (!createOrUpdateThreads.length) {
            return [];
        }

        const threadsParticipants: ParticipantsPerThread[] = [];

        // Let's process the thread data
        for (const thread of createOrUpdateThreads) {
            // Avoid participants field set as "null" from overriding the existing ones
            if (Array.isArray(thread.participants)) {
                threadsParticipants.push({
                    thread_id: thread.id,
                    participants: thread.participants.map((participant) => ({
                        id: participant.id,
                        thread_id: thread.id,
                    })),
                });
            }
        }

        // Get thread models to be created and updated
        const preparedThreads = await this.handleRecords({
            fieldName: 'id',
            transformer: transformThreadRecord,
            prepareRecordsOnly: true,
            createOrUpdateRawValues: createOrUpdateThreads,
            tableName: THREAD,
            shouldUpdate: shouldUpdateThreadRecord,
        }, 'handleThreads(NEVER)');

        // Add the models to be batched here
        const batch: Model[] = [...preparedThreads];

        // calls handler for Thread Participants
        const threadParticipants = (await this.handleThreadParticipants({threadsParticipants, prepareRecordsOnly: true})) as ThreadParticipantModel[];
        batch.push(...threadParticipants);

        if (teamId) {
            const threadsInTeam = await this.handleThreadInTeam({
                threadsMap: {[teamId]: threads},
                prepareRecordsOnly: true,
            }) as ThreadInTeamModel[];
            if (threadsInTeam.length) {
                batch.push(...threadsInTeam);
            }
        }

        if (batch.length && !prepareRecordsOnly) {
            await this.batchRecords(batch, 'handleThreads');
        }

        return batch;
    };

    /**
     * handleThreadParticipants: Handler responsible for the Create/Update operations occurring on the ThreadParticipants table from the 'Server' schema
     * @param {HandleThreadParticipantsArgs} handleThreadParticipants
     * @param {ParticipantsPerThread[]} handleThreadParticipants.threadsParticipants
     * @param {boolean} handleThreadParticipants.prepareRecordsOnly
     * @param {boolean} handleThreadParticipants.skipSync
     * @returns {Promise<Array<ThreadParticipantModel>>}
     */
    handleThreadParticipants = async ({threadsParticipants, prepareRecordsOnly, skipSync = false}: HandleThreadParticipantsArgs): Promise<ThreadParticipantModel[]> => {
        const batchRecords: ThreadParticipantModel[] = [];

        // NOTE: Participants list can also be an empty array
        for await (const threadParticipant of threadsParticipants) {
            const {thread_id, participants} = threadParticipant;
            const rawValues = getUniqueRawsBy({raws: participants, key: 'id'}) as ThreadParticipant[];
            const {
                createParticipants,
                deleteParticipants,
            } = await sanitizeThreadParticipants({
                database: this.database,
                thread_id,
                rawParticipants: rawValues,
                skipSync,
            });

            if (createParticipants?.length) {
                // Prepares record for model ThreadParticipants
                const participantsRecords = (await this.prepareRecords({
                    createRaws: createParticipants,
                    transformer: transformThreadParticipantRecord,
                    tableName: THREAD_PARTICIPANT,
                })) as ThreadParticipantModel[];
                batchRecords.push(...participantsRecords);
            }

            if (deleteParticipants?.length) {
                batchRecords.push(...deleteParticipants);
            }
        }

        if (prepareRecordsOnly) {
            return batchRecords;
        }

        if (batchRecords?.length) {
            await this.batchRecords(batchRecords, 'handleThreadParticipants');
        }

        return batchRecords;
    };

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
                Q.where('thread_id', Q.oneOf(threadIds)),
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
            await this.batchRecords(threadsInTeam, 'handleThreadInTeam');
        }

        return threadsInTeam;
    };
};

export default ThreadHandler;
