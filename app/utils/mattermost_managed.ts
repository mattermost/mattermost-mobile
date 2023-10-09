// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules, Platform} from 'react-native';

const {MattermostManaged} = NativeModules;

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
    } = MattermostManaged.getConstants();

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
    databaseName = undefined,
    shouldRemoveDirectory = false,
}: IOSDeleteDatabase) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return MattermostManaged.deleteDatabaseDirectory(databaseName, shouldRemoveDirectory, () => null);
};

/**
 * renameIOSDatabase renames the .db and any other related file to the new name.
 * @param {string} from original database name
 * @param {string} to new database name
 */
export const renameIOSDatabase = (from: string, to: string) => {
    MattermostManaged.renameDatabase(from, to, () => null);
};

export const deleteEntititesFile = (callback?: (success: boolean) => void) => {
    if (Platform.OS === 'ios') {
        MattermostManaged.deleteEntititesFile((result: boolean) => {
            if (callback) {
                callback(result);
            }
        });
    } else if (callback) {
        callback(true);
    }
};
