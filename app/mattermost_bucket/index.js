// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NativeModules, Platform} from 'react-native';

// TODO: Remove platform specific once android is implemented
const MattermostBucket = Platform.OS === 'ios' ? NativeModules.MattermostBucket : null;

export default {
    setPreference: (key, value, groupName) => {
        if (MattermostBucket) {
            MattermostBucket.setPreference(key, value, groupName);
        }
    },
    getPreference: async (key, groupName) => {
        if (MattermostBucket) {
            const value = await MattermostBucket.getPreference(key, groupName);
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
    removePreference: (key, groupName) => {
        if (MattermostBucket) {
            MattermostBucket.removePreference(key, groupName);
        }
    },
    writeToFile: (fileName, content, groupName) => {
        if (MattermostBucket) {
            MattermostBucket.writeToFile(fileName, content, groupName);
        }
    },
    readFromFile: async (fileName, groupName) => {
        if (MattermostBucket) {
            const value = await MattermostBucket.readFromFile(fileName, groupName);
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
    removeFile: (fileName, groupName) => {
        if (MattermostBucket) {
            MattermostBucket.removeFile(fileName, groupName);
        }
    },
};
