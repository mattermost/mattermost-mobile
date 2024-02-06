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

export const queryFilesForPost = (database: Database, postId: string) => {
    return database.get<FileModel>(FILE).query(
        Q.where('post_id', postId),
    );
};

export const observeFilesForPost = (database: Database, postId: string) => {
    return queryFilesForPost(database, postId).observe();
};
