// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import {Platform} from 'react-native';

type IOSDeleteDatabase = { databaseName?: string; shouldRemoveDirectory?: boolean }
type IOSAppGroupDetails = { appGroupIdentifier: string; appGroupSharedDirectory: string; appGroupDatabase: string }

/**
 * Retrieves information relative to the iOS AppGroup identifier and folders
 * @returns {{appGroupIdentifier: string, appGroupSharedDirectory: string, appGroupDatabase: string}}
 */
export const getIOSAppGroupDetails = (): IOSAppGroupDetails => {
    const {
        appGroupIdentifier,
        appGroupSharedDirectory: {sharedDirectory, databasePath},
    } = RNUtils.getConstants();

    const appGroup = {
        appGroupIdentifier,
        appGroupSharedDirectory: sharedDirectory,
        appGroupDatabase: databasePath,
    };

    // logInfo('appGroup => ', appGroup.appGroupDatabase);
    return appGroup;
};

/**
 * BEWARE: deleteIOSDatabase is used to either delete a single .db file by its name or can also be used to delete the whole 'database' directory under the shared AppGroup directory.
 * USE WITH CAUTION.
 * @param {string} databaseName
 * @param {boolean} shouldRemoveDirectory
 * e.g :
 * MattermostManaged.deleteDatabaseDirectory(databaseName, shouldRemoveDirectory, (error: any, success: any) => {    });
 */
export const deleteIOSDatabase = async ({
    databaseName = '',
    shouldRemoveDirectory = false,
}: IOSDeleteDatabase) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return RNUtils.deleteDatabaseDirectory(databaseName, shouldRemoveDirectory);
};

/**
 * renameIOSDatabase renames the .db and any other related file to the new name.
 * @param {string} from original database name
 * @param {string} to new database name
 */
export const renameIOSDatabase = (from: string, to: string) => {
    return RNUtils.renameDatabase(from, to);
};

export const deleteEntitiesFile = () => {
    if (Platform.OS === 'ios') {
        return RNUtils.deleteEntitiesFile();
    }

    return Promise.resolve(true);
};
