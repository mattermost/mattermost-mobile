// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type FileModel from '@typings/database/models/servers/file';

const {SERVER: {FILE}} = MM_TABLES;

export const getFileById = async (database: Database, fileId: string) => {
    try {
        const record = (await database.get<FileModel>(FILE).find(fileId));
        return record;
    } catch {
        return undefined;
    }
};

export const queryFilesById = (database: Database, fileIds: string[], sort?: Q.SortOrder) => {
    const clauses: Q.Clause[] = [Q.where('id', Q.oneOf(fileIds))];
    if (sort) {
        clauses.push(Q.sortBy('create_at', sort));
    }
    return database.get<FileModel>(FILE).query(...clauses);
};
