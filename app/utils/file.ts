// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {FileSystem} from 'react-native-unimodules';

const vectorIconsDir = 'vectorIcons';

export async function deleteFileCache() {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
        const cacheDirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (cacheDirInfo.exists) {
            if (Platform.OS === 'ios') {
                await FileSystem.deleteAsync(cacheDir, {idempotent: true});
                await FileSystem.makeDirectoryAsync(cacheDir, {intermediates: true});
            } else {
                const lstat = await FileSystem.readDirectoryAsync(cacheDir);
                lstat.forEach((stat: string) => {
                    if (!stat.includes(vectorIconsDir)) {
                        FileSystem.deleteAsync(stat, {idempotent: true});
                    }
                });
            }
        }
    }

    return true;
}