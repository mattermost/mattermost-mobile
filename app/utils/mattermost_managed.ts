// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules} from 'react-native';
const {MattermostManaged} = NativeModules;

/**
 * Retrieves information relative to the iOS AppGroup identifier and folders
 * @returns {{appGroupIdentifier: string, appGroupSharedDirectory: string, appGroupDatabase: string}}
 */
export const getIOSAppGroupDetails = (): {appGroupIdentifier: string, appGroupSharedDirectory: string, appGroupDatabase: string} => {
    const {appGroupIdentifier, appGroupSharedDirectory: {sharedDirectory, databasePath}} = MattermostManaged.getConstants();

    const appGroup = {
        appGroupIdentifier,
        appGroupSharedDirectory: sharedDirectory,
        appGroupDatabase: databasePath,
    };
    console.log('appGroup => ', appGroup);
    return appGroup;
};

/**
 * BEWARE: Deletes a specific database file (e.g. default.db) if there is a value in databaseName, else it will delete the whole
 * databases directory under the App-Group shared folder
 * @param {string} databaseName
 */
export const deleteIOSDatabase = (databaseName?: string) => {
    MattermostManaged.deleteDatabaseDirectory(databaseName, (error: any, success: any) => {
        console.log(error, success);
    });
};
