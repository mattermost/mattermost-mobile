// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AppRegistry, Platform} from 'react-native';

import 'app/mattermost';
import ShareExtension from 'share_extension/android';

if (Platform.OS === 'android') {
    AppRegistry.registerComponent('MattermostShare', () => ShareExtension);
}
