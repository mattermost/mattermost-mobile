// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable no-unused-vars */
import {AppRegistry, Platform} from 'react-native';

// import Mattermost from 'app/mattermost_deprecated';
import App from 'app/app';
import ShareExtension from 'share_extension/android';

if (Platform.OS === 'android') {
    AppRegistry.registerComponent('MattermostShare', () => ShareExtension);
}

// TODO: Keep old implementation for iOS
// const app = new Mattermost();
