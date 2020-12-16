// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules} from 'react-native';

/**
 * getIOSAppGroupDetails : Returns the IOS App-Group id
 * @returns {string}
 */
export const getIOSAppGroupDetails = (): {appGroupIdentifier: string, appGroupSharedDirectory: string, appGroupDatabase: string} => {
    const appGroup = {
        appGroupIdentifier: NativeModules.MattermostManaged.appGroupIdentifier,
        appGroupSharedDirectory: NativeModules.MattermostManaged.appGroupSharedDirectory.sharedDirectory,
        appGroupDatabase: NativeModules.MattermostManaged.appGroupSharedDirectory.databasePath,
    };
    console.log('appGroup => ', appGroup);
    return appGroup;
};
