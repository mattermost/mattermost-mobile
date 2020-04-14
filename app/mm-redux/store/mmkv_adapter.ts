// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

import MMKV from 'react-native-mmkv-storage';

type ReadOnlyArrayString = ReadonlyArray<string>;

type MultiGetCallbackFunction = (
    errors: ReadonlyArray<Error> | null | undefined,
    result: ReadonlyArray<ReadOnlyArrayString> | null | undefined,
) => void;

type MultiRequest = {
    keys: ReadonlyArray<string>;
    callback: MultiGetCallbackFunction | null | undefined;
    keyIndex: number;
    resolve: (
        result?: Promise<ReadonlyArray<ReadOnlyArrayString> | null | undefined>,
    ) => void | null | undefined;
    reject: (error?: any) => void | null | undefined;
};

function checkValidInput(usedKey: string, value?: any) {
    const isValuePassed = arguments.length > 1;

    if (typeof usedKey !== 'string') {
        console.warn(
            `[MMKVStorageAdapter] Using ${typeof usedKey} type is not suppported. This can lead to unexpected behavior/errors. Use string instead.\nKey passed: ${usedKey}\n`,
        );
    }

    if (isValuePassed && typeof value !== 'string') {
        if (value == null) {
            throw new Error(
                `[MMKVStorageAdapter] Passing null/undefined as value is not supported. If you want to remove value, Use .remove method instead.\nPassed value: ${value}\nPassed key: ${usedKey}\n`,
            );
        } else {
            console.warn(
                `[MMKVStorageAdapter] The value for key "${usedKey}" is not a string. This can lead to unexpected behavior/errors. Consider stringifying it.\nPassed value: ${value}\nPassed key: ${usedKey}\n`,
            );
        }
    }
}

const MMKVStorageAdapter = {
    _getRequests: [] as Array<MultiRequest>,
    _getKeys: [] as Array<string>,
    _immediate: null as number | null | undefined,

    getItem: (
        key: string,
        callback?: (
            error: Error | null | undefined,
            result: string | null,
        ) => void | null | undefined,
    ): Promise<string | null> => {
        return new Promise((resolve, reject) => {
            checkValidInput(key);
            MMKV.getStringAsync(key).then((result: string) => {
                if (callback) {
                    callback(null, result);
                }
                resolve(result);
            }).catch((error) => {
                if (callback) {
                    callback(null, error);
                }

                reject(error);
            });
        });
    },

    setItem: (
        key: string,
        value: string,
        callback?: (
            error: Error | null | undefined
        ) => void | null | undefined,
    ): Promise<null> => {
        return new Promise((resolve, reject) => {
            checkValidInput(key, value);
            MMKV.setStringAsync(key, value).then(() => {
                if (callback) {
                    callback(null);
                }
                resolve(null);
            }).catch((error) => {
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
            error: Error | null | undefined
        ) => void | null | undefined,
    ): Promise<null> => {
        checkValidInput(key);
        if (callback) {
            callback(null);
        }
        return MMKV.removeItem(key);
    },

    clear: (callback?: (error: Error | null | undefined) => void | null | undefined): Promise<null> => {
        if (callback) {
            callback(null);
        }

        return MMKV.clearStore();
    },

    getAllKeys: (
        callback?: (
            error: Error | null | undefined,
            keys: ReadOnlyArrayString | null | undefined
        ) => void,
    ): Promise<ReadOnlyArrayString> => {
        return new Promise((resolve, reject) => {
            MMKV.getKeysAsync().then((keys: Array<string>) => {
                if (callback) {
                    callback(null, keys);
                }
                resolve(keys);
            }).catch((error) => {
                if (callback) {
                    callback(error, null);
                }
                reject(error);
            });
        });
    },
};

export default MMKVStorageAdapter;