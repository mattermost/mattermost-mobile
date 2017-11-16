// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import RNFetchBlob from 'react-native-fetch-blob';
import {DeviceTypes} from 'app/constants/';

const {VIDEOS_PATH} = DeviceTypes;

export function generateId() {
    // Implementation taken from http://stackoverflow.com/a/2117523
    let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

    id = id.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);

        let v;
        if (c === 'x') {
            v = r;
        } else {
            v = (r & 0x3) | 0x8;
        }

        return v.toString(16);
    });

    return 'uid' + id;
}

export async function getFileCacheSize() {
    const isDir = await RNFetchBlob.fs.isDir(VIDEOS_PATH);
    if (isDir) {
        const stats = await RNFetchBlob.fs.lstat(VIDEOS_PATH);
        return stats.reduce((accumulator, stat) => {
            return accumulator + parseInt(stat.size, 10);
        }, 0);
    }

    return 0;
}

export async function deleteFileCache() {
    return await RNFetchBlob.fs.unlink(VIDEOS_PATH);
}
