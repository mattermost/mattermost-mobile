// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import {NativeModules} from 'react-native';

const {Watch} = NativeModules;

export default {
    setCredentials: Watch.setCredentials
};
