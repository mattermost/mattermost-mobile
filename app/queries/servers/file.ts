// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

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

export const observeFileById = (database: Database, id: string) => {
    return database.get<FileModel>(FILE).query(Q.where('id', id), Q.take(1)).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );
};

export const queryFilesForPost = (database: Database, postId: string) => {
    return database.get<FileModel>(FILE).query(
        Q.where('post_id', postId),
    );
};

export const observeFilesForPost = (database: Database, postId: string) => {
    return queryFilesForPost(database, postId).observe();
};

export const getFilesByIds = async (database: Database, fileIds: string[]) => {
    if (!fileIds.length) {
        return [];
    }

    try {
        const records = await database.get<FileModel>(FILE).query(
            Q.where('id', Q.oneOf(fileIds)),
        ).fetch();
        return records;
    } catch {
        return [];
    }
};
