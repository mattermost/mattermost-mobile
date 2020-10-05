// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {AppRegistry, Platform} from 'react-native';
import {getStorybookUI, configure} from '@storybook/react-native';

import {loadStories} from './storyLoader';

import './rn-addons';

// import stories
configure(() => {
    loadStories();
}, module);

// Refer to https://github.com/storybookjs/storybook/tree/master/app/react-native#start-command-parameters
// To find allowed options for getStorybookUI
const StorybookUIRoot = getStorybookUI({
    port: 7007,
    host: Platform.OS === 'ios' ? 'localhost' : '10.0.2.2',
    onDeviceUI: true,
    resetStorybook: true,
});

// If you are using React Native vanilla and after installation you don't see your app name here, write it manually.
// If you use Expo you can safely remove this line.
AppRegistry.registerComponent('Mattermost', () => StorybookUIRoot);

export default StorybookUIRoot;
