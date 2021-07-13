// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {FileSystem} from 'react-native-unimodules';

import {hashCode} from './security';

export async function deleteFileCache(serverUrl: string) {
    const serverDir = hashCode(serverUrl);
    const cacheDir = `${FileSystem.cacheDirectory}${serverDir}`;
    if (cacheDir) {
        const cacheDirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (cacheDirInfo.exists) {
            if (Platform.OS === 'ios') {
                await FileSystem.deleteAsync(cacheDir, {idempotent: true});
                await FileSystem.makeDirectoryAsync(cacheDir, {intermediates: true});
            } else {
                const lstat = await FileSystem.readDirectoryAsync(cacheDir);
                lstat.forEach((stat: string) => {
                    FileSystem.deleteAsync(stat, {idempotent: true});
                });
            }
        }
    }

    return true;
}
