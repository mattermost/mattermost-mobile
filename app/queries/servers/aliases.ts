// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {switchMap} from '@nozbe/watermelondb/utils/rx';
import {of as of$} from 'rxjs';

import {MM_TABLES} from '@constants/database';

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

export const getAliasById = async (database: Database, id: string) => {
    try {
        const aliases = await getAliases(database);
        if (aliases) {
            const foundAlias = aliases.find(({from}) => from === id);
            return foundAlias?.to;
        }

        return undefined;
    } catch (error) {
        return undefined;
    }
};

export const observeAliasStringByChannelId = (database: Database, channelId: string) => {
    const collection = getAliasesCollection(database);
    if (!collection) {
        return of$(undefined);
    }

    return collection.query(Q.where('from', channelId)).observe().pipe(
        switchMap((aliases) => of$(aliases.length ? aliases[0].to : undefined)),
    );
};
