// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NativeModules, Platform} from 'react-native';

// TODO: Remove platform specific once android is implemented
const MattermostBucket = Platform.OS === 'ios' ? NativeModules.MattermostBucket : null;

export default {
    set: (key, value, groupName) => {
        if (MattermostBucket) {
            MattermostBucket.set(key, value, groupName);
        }
    },
    get: async (key, groupName) => {
        if (MattermostBucket) {
            const value = await MattermostBucket.get(key, groupName);
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
    remove: (key, groupName) => {
        if (MattermostBucket) {
            MattermostBucket.remove(key, groupName);
        }
    }
};
