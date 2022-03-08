// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

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
export const sanitizeThreadParticipants = async ({database, thread_id, rawParticipants}: SanitizeThreadParticipantsArgs) => {
    const participants = (await database.collections.
        get(THREAD_PARTICIPANT).
        query(Q.where('thread_id', thread_id)).
        fetch()) as ThreadParticipantModel[];

    // similarObjects: Contains objects that are in both the RawParticipant array and in the ThreadParticipant table
    const similarObjects: ThreadParticipantModel[] = [];

    const createParticipants: RecordPair[] = [];

    for (let i = 0; i < rawParticipants.length; i++) {
        const rawParticipant = rawParticipants[i];

        // If the participant is not present let's add them to the db
        const exists = participants.find((participant) => participant.userId === rawParticipant.id);

        if (exists) {
            similarObjects.push(exists);
        } else {
            createParticipants.push({raw: rawParticipant});
        }
    }

    // finding out elements to delete using array subtract
    const deleteParticipants = participants.
        filter((participant) => !similarObjects.includes(participant)).
        map((outCast) => outCast.prepareDestroyPermanently());

    return {createParticipants, deleteParticipants};
};
