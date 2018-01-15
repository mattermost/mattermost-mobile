// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AppRegistry} from 'react-native';

/* eslint-disable no-unused-vars */
import Mattermost from 'app/mattermost';
import ShareExtension from 'share_extension/android';

AppRegistry.registerComponent('MattermostShare', () => ShareExtension);
const app = new Mattermost();
