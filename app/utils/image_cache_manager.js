// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

// Based on the work done by https://github.com/wcandillon/react-native-expo-image-cache/

import base64 from 'base-64';
import RNFetchBlob from 'react-native-fetch-blob';

import {DeviceTypes} from 'app/constants';

const {IMAGES_PATH} = DeviceTypes;

export default class ImageCacheManager {
    static listeners = {};

    static cache = async (filename, uri, listener) => {
        const {path, exists} = await getCacheFile(filename, uri);
        if (isDownloading(uri)) {
            addListener(uri, listener);
        } else if (exists) {
            listener(path);
        } else {
            addListener(uri, listener);
            try {
                const options = {
                    session: base64.encode(uri),
                    timeout: 10000,
                    indicator: true,
                    overwrite: true,
                    path,
                };

                this.downloadTask = await RNFetchBlob.config(options).fetch('GET', uri);
                if (this.downloadTask.respInfo.respType === 'text') {
                    throw new Error();
                }

                notifyAll(uri, path);
            } catch (e) {
                RNFetchBlob.fs.unlink(path);
                notifyAll(uri, uri);
            }
            unsubscribe(uri);
        }
    };
}

export const getCacheFile = async (name, uri) => {
    const filename = name || uri.substring(uri.lastIndexOf('/'), uri.indexOf('?') === -1 ? uri.length : uri.indexOf('?'));
    const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
    const path = `${IMAGES_PATH}/${base64.encode(uri)}${ext}`;

    try {
        const isDir = await RNFetchBlob.fs.isDir(IMAGES_PATH);
        if (!isDir) {
            await RNFetchBlob.fs.mkdir(IMAGES_PATH);
        }
    } catch (error) {
        // do nothing
    }

    const exists = await RNFetchBlob.fs.exists(path);
    return {exists, path};
};

const isDownloading = (uri) => Boolean(ImageCacheManager.listeners[uri]);

const addListener = (uri, listener) => {
    if (!ImageCacheManager.listeners[uri]) {
        ImageCacheManager.listeners[uri] = [];
    }
    ImageCacheManager.listeners[uri].push(listener);
};

const unsubscribe = (uri) => Reflect.deleteProperty(ImageCacheManager.listeners, uri);

const notifyAll = (uri, path) => {
    ImageCacheManager.listeners[uri].forEach((listener) => {
        if (typeof listener === 'function') {
            listener(path);
        }
    });
};
