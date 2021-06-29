// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

import MMKVStorage from 'react-native-mmkv-storage';

function checkValidInput(usedKey: string, value?: any) {
    const isValuePassed = arguments.length > 1;

    if (typeof usedKey !== 'string') {
        console.warn(
            `[MMKVStorageAdapter] Using ${typeof usedKey} type is not suppported. This can lead to unexpected behavior/errors. Use string instead.\nKey passed: ${usedKey}\n`,
        );
    }

    if (isValuePassed && typeof value !== 'object') {
        if (value == null) {
            throw new Error(
                `[MMKVStorageAdapter] Passing null/undefined as value is not supported. If you want to remove value, Use .remove method instead.\nPassed value: ${value}\nPassed key: ${usedKey}\n`,
            );
        } else {
            console.warn(
                `[MMKVStorageAdapter] The value for key "${usedKey}" is not a object. This can lead to unexpected behavior/errors. Consider JSON.parse it.\nPassed value: ${value}\nPassed key: ${usedKey}\n`,
            );
        }
    }
}

export default async function getStorage(identifier = 'default') {
    const MMKV = await new MMKVStorage.Loader().
        withInstanceID(identifier).
        setProcessingMode(MMKVStorage.MODES.MULTI_PROCESS).
        initialize();

    return {
        getItem: (
            key: string,
            callback?: (
                error: Error | null,
                result: string | null,
            ) => void | null | undefined,
        ): Promise<string | Error> => {
            return new Promise((resolve, reject) => {
                checkValidInput(key);
                MMKV.getStringAsync(key).then((result: string) => {
                    if (callback) {
                        callback(null, result);
                    }
                    resolve(JSON.parse(result));
                }).catch((error: Error) => {
                    if (callback) {
                        callback(error, null);
                    }
                    reject(error);
                });
            });
        },

        setItem: (
            key: string,
            value: object,
            callback?: (
                error: Error | null
            ) => void | null | undefined,
        ): Promise<null | Error> => {
            return new Promise((resolve, reject) => {
                checkValidInput(key, value);
                MMKV.setStringAsync(key, JSON.stringify(value)).then(() => {
                    if (callback) {
                        callback(null);
                    }
                    resolve(null);
                }).catch((error: Error) => {
                    if (callback) {
                        callback(error);
                    }
                    reject(error);
                });
            });
        },

        removeItem: (
            key: string,
            callback?: (
                error: null
            ) => void | null | undefined,
        ): Promise<boolean> => {
            checkValidInput(key);
            if (callback) {
                callback(null);
            }

            return new Promise(() => {
                return MMKV.removeItem(key);
            });
        },
    };
}
