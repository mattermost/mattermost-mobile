// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Based on the work done by https://github.com/wcandillon/react-native-expo-image-cache/

import {Platform} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';

import {Client4} from 'mattermost-redux/client';

import {DeviceTypes} from 'app/constants';
import mattermostBucket from 'app/mattermost_bucket';

const {IMAGES_PATH} = DeviceTypes;
let siteUrl;

export default class ImageCacheManager {
    static listeners = {};

    static cache = async (filename, uri, listener) => {
        if (!listener) {
            console.warn('Unable to cache image when no listener is provided'); // eslint-disable-line no-console
        }

        const {path, exists} = await getCacheFile(filename, uri);
        const prefix = Platform.OS === 'android' ? 'file://' : '';
        if (isDownloading(uri)) {
            addListener(uri, listener);
        } else if (exists) {
            listener(`${prefix}${path}`);
        } else {
            addListener(uri, listener);
            if (uri.startsWith('http')) {
                try {
                    const certificate = await mattermostBucket.getPreference('cert');
                    const options = {
                        session: uri,
                        timeout: 10000,
                        indicator: true,
                        overwrite: true,
                        path,
                        certificate,
                    };

                    const headers = {};
                    if (uri.includes(Client4.getUrl()) || uri.includes(siteUrl)) {
                        headers.Authorization = `Bearer ${Client4.getToken()}`;
                        headers['X-Requested-With'] = 'XMLHttpRequest';
                    }

                    this.downloadTask = await RNFetchBlob.config(options).fetch('GET', uri, headers);
                    if (this.downloadTask.respInfo.respType === 'text') {
                        throw new Error();
                    }

                    notifyAll(uri, `${prefix}${path}`);
                } catch (e) {
                    RNFetchBlob.fs.unlink(`${prefix}${path}`);
                    notifyAll(uri, uri);
                }
            } else {
                // In case the uri we are trying to cache is already a local file just notify and return
                notifyAll(uri, uri);
            }

            unsubscribe(uri);
        }
    };
}

export const getCacheFile = async (name, uri) => {
    const filename = name || uri.substring(uri.lastIndexOf('/'), uri.indexOf('?') === -1 ? uri.length : uri.indexOf('?'));
    const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
    const path = `${IMAGES_PATH}/${Math.abs(hashCode(uri))}${ext}`;

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

export const getSiteUrl = () => {
    return siteUrl;
};

export const setSiteUrl = (url) => {
    siteUrl = url;
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
    if (!str || str.length === 0) {
        return hash;
    }

    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};
