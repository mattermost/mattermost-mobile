// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type {Clause} from '@nozbe/watermelondb/QueryDescription';
import type {RecordPair, SanitizeThreadParticipantsArgs} from '@typings/database/database';
import type ThreadParticipantModel from '@typings/database/models/servers/thread_participant';

const {THREAD_PARTICIPANT} = MM_TABLES.SERVER;

/**
 * sanitizeThreadParticipants: Treats participants in a Thread. For example, a user can participate/not.  Hence, this function
 * tell us which participants to create/delete in the ThreadParticipants table.
 * @param {SanitizeThreadParticipantsArgs} sanitizeThreadParticipants
 * @param {Database} sanitizeThreadParticipants.database
 * @param {string} sanitizeThreadParticipants.thread_id
 * @param {UserProfile[]} sanitizeThreadParticipants.rawParticipants
 * @returns {Promise<{createParticipants: ThreadParticipant[],  deleteParticipants: ThreadParticipantModel[]}>}
 */
export const sanitizeThreadParticipants = async ({database, skipSync, thread_id, rawParticipants}: SanitizeThreadParticipantsArgs) => {
    const clauses: Clause[] = [Q.where('thread_id', thread_id)];

    // Check if we already have the participants
    if (skipSync) {
        clauses.push(
            Q.where('user_id', Q.oneOf(
                rawParticipants.map((participant) => participant.id),
            )),
        );
    }
    const participants = (await database.collections.
        get<ThreadParticipantModel>(THREAD_PARTICIPANT).
        query(...clauses).
        fetch());

    // similarObjects: Contains objects that are in both the RawParticipant array and in the ThreadParticipant table
    const similarObjects = new Set<ThreadParticipantModel>();

    const createParticipants: Array<RecordPair<ThreadParticipantModel, ThreadParticipant>> = [];
    const participantsMap = participants.reduce((result: Record<string, ThreadParticipantModel>, participant) => {
        result[participant.userId] = participant;
        return result;
    }, {});

    for (let i = 0; i < rawParticipants.length; i++) {
        const rawParticipant = rawParticipants[i];

        // If the participant is not present let's add them to the db
        const exists = participantsMap[rawParticipant.id];

        if (exists) {
            similarObjects.add(exists);
        } else {
            createParticipants.push({raw: rawParticipant});
        }
    }

    if (skipSync) {
        return {createParticipants, deleteParticipants: []};
    }

    // finding out elements to delete using array subtract
    const deleteParticipants = participants.
        filter((participant) => !similarObjects.has(participant)).
        map((outCast) => outCast.prepareDestroyPermanently());

    return {createParticipants, deleteParticipants};
};
