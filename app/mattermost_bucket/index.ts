// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules, Platform} from 'react-native';

// TODO: Remove platform specific once android is implemented
const MattermostBucket = Platform.OS === 'ios' ? NativeModules.MattermostBucketModule : null;

export default {
    setPreference: (key, value) => {
        if (MattermostBucket) {
            MattermostBucket.setPreference(key, value);
        }
    },
    getPreference: async (key) => {
        if (MattermostBucket) {
            const value = await MattermostBucket.getPreference(key);
            if (value) {
                try {
                    return JSON.parse(value);
                } catch (e) {
                    return value;
                }
            }
        }

        return null;
    },
    removePreference: (key) => {
        if (MattermostBucket) {
            MattermostBucket.removePreference(key);
        }
    },
    writeToFile: (fileName, content) => {
        if (MattermostBucket) {
            MattermostBucket.writeToFile(fileName, content);
        }
    },
    readFromFile: async (fileName) => {
        if (MattermostBucket) {
            const value = await MattermostBucket.readFromFile(fileName);
            if (value) {
                try {
                    return JSON.parse(value);
                } catch (e) {
                    return value;
                }
            }
        }

        return null;
    },
    removeFile: (fileName) => {
        if (MattermostBucket) {
            MattermostBucket.removeFile(fileName);
        }
    },
};
