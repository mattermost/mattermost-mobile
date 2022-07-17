// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import {observeConfigBooleanValue, observeLicense} from '@queries/servers/system';

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

export function observeCanDownloadFiles(database: Database) {
    const license = observeLicense(database);
    const enableMobileFileDownload = observeConfigBooleanValue(database, 'EnableMobileFileDownload');
    const complianceDisabled = license.pipe(switchMap((l) => of$(l?.IsLicensed === 'false' || l?.Compliance === 'false')));
    const canDownloadFiles = combineLatest([enableMobileFileDownload, complianceDisabled]).pipe(
        switchMap(([download, compliance]) => of$(compliance || download)),
    );
    return canDownloadFiles;
}
