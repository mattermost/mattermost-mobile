// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import type {Database} from '@nozbe/watermelondb';
import type AliasesModel from '@typings/database/models/servers/aliases';

const {
    SERVER: {ALIASES},
} = MM_TABLES;

export const getAliasesCollection = (database: Database) => {
    try {
        const aliasesModel = database.collections.get<AliasesModel>(ALIASES);

        return aliasesModel;
    } catch {
        return undefined;
    }
};

export const getAliases = async (database: Database) => {
    try {
        const aliasesCollection = getAliasesCollection(database);
        if (aliasesCollection) {
            const aliases = await aliasesCollection.query().fetch();
            return aliases;
        }
        return undefined;
    } catch (error) {
        return undefined;
    }
};
