// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

// Based on the work done by https://github.com/wcandillon/react-native-expo-image-cache/

import RNFetchBlob from 'react-native-fetch-blob';

import {DeviceTypes} from 'app/constants';

const {IMAGES_PATH} = DeviceTypes;

export default class ImageCacheManager {
    static listeners = {};

    static cache = async (filename, uri, listener) => {
        if (!listener) {
            console.warn('Unable to cache image when no listener is provided'); // eslint-disable-line no-console
        }

        const {path, exists} = await getCacheFile(filename, uri);
        if (isDownloading(uri)) {
            addListener(uri, listener);
        } else if (exists) {
            listener(path);
        } else {
            addListener(uri, listener);
            if (uri.startsWith('file://')) {
                // In case the uri we are trying to cache is already a local file just notify and return
                notifyAll(uri, uri);
                return;
            }

            try {
                const options = {
                    session: uri,
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
    const path = `${IMAGES_PATH}/${hashCode(uri)}${ext}`;

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

// taken from https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
const hashCode = (str) => {
    let hash = 0;
    let i;
    let chr;
    if (str.length === 0) {
        return hash;
    }

    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};
