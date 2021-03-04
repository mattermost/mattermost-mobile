// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { Q } from '@nozbe/watermelondb';

import { MM_TABLES } from '@constants/database';
import { DatabaseInstance, RawReaction, RecordValue } from '@typings/database/database';
import Reaction from '@typings/database/reaction';

import OperatorFieldException from './exceptions/operator_field_exception';

const { REACTION } = MM_TABLES.SERVER;

type MissingFieldUtil = {
    fields: string[];
    rawValue: RecordValue;
    tableName: string;
};

export const checkForMissingFields = ({ fields, rawValue, tableName }: MissingFieldUtil) => {
    const missingFields = [];
    for (const rawField in Object.keys(rawValue)) {
        if (!fields.includes(rawField)) {
            missingFields.push(rawField);
        }
    }
    if (missingFields.length > 0) {
        throw new OperatorFieldException(
            `OperatorFieldException: The object for entity ${tableName} has some mandatory fields missing`,
            missingFields,
        );
    }
};

export const sanitizeReactions = async ({
    database,
    post_id,
    rawReactions,
}: {
    database: DatabaseInstance;
    post_id: string;
    rawReactions: RawReaction[];
}) => {
    const reactions = (await database!.collections
        .get(REACTION)
        .query(Q.where('post_id', post_id))
        .fetch()) as Reaction[];

    if (reactions?.length < 1) {
        // We do not have existing reactions bearing this post_id; thus we CREATE them.
        return { createReactions: rawReactions, deleteReactions: [] };
    }

    // similarObjects: Contains objects that are in both the RawReaction array and in the Reaction entity
    const similarObjects = [] as Reaction[];

    const createReactions = [] as RawReaction[];

    for (let i = 0; i < rawReactions.length; i++) {
        const rawReaction = rawReactions[i] as RawReaction;

        // Do we have a similar value of rawReaction in the REACTION table?
        const idxPresent = reactions.findIndex((value) => {
            return value.userId === rawReaction.user_id && value.emojiName === rawReaction.emoji_name;
        });

        if (idxPresent === -1) {
            // So, we don't have a similar Reaction object.  That one is new...so we'll create it
            createReactions.push(rawReaction);
        } else {
            // we have a similar object in both reactions and rawReactions; we'll pop it out from both arrays
            similarObjects.push(reactions[idxPresent]);
        }
    }

    // finding out elements to delete using array subtract
    const deleteReactions = reactions
        .filter((reaction) => !similarObjects.includes(reaction))
        .map((outCast) => outCast.prepareDestroyPermanently());

    return { createReactions, deleteReactions };
};
