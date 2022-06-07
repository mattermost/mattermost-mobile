// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import type {Database} from '@nozbe/watermelondb';
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
