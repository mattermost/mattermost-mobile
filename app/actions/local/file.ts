// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

export const updateLocalFile = async (serverUrl: string, file: FileInfo) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    return operator.handleFiles({files: [file], prepareRecordsOnly: false});
};
