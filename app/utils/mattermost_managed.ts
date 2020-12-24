// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules} from 'react-native';

const {MattermostManaged} = NativeModules;

/**
 * Retrieves information relative to the iOS AppGroup identifier and folders
 * @returns {{appGroupIdentifier: string, appGroupSharedDirectory: string, appGroupDatabase: string}}
 */
export const getIOSAppGroupDetails = (): { appGroupIdentifier: string, appGroupSharedDirectory: string, appGroupDatabase: string } => {
    const {
        appGroupIdentifier,
        appGroupSharedDirectory: {sharedDirectory, databasePath},
    } = MattermostManaged.getConstants();

    const appGroup = {
        appGroupIdentifier,
        appGroupSharedDirectory: sharedDirectory,
        appGroupDatabase: databasePath,
    };
    console.log('appGroup => ', appGroup.appGroupDatabase);
    return appGroup;
};

/**
 * BEWARE: deleteIOSDatabase is used to either delete a single .db file by its name or can also be used to delete the whole 'database' directory under the shared AppGroup directory.
 * USE WITH CAUTION.
 * @param {string} databaseName
 * @param {boolean} shouldRemoveDirectory
 */
export const deleteIOSDatabase = ({
    databaseName = undefined,
    shouldRemoveDirectory = false,
}: { databaseName?: string, shouldRemoveDirectory?: boolean }) => {
    MattermostManaged.deleteDatabaseDirectory(databaseName, shouldRemoveDirectory, (error: any, success: any) => {
        console.log(error, success);
    });
};
