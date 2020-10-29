// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Platform} from 'react-native';
import {getStorybookUI, configure} from '@storybook/react-native';

// load react-native addons for storybook rn
import '@storybook/addon-ondevice-knobs/register';

import {loadStories} from './storyLoader';

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

export default StorybookUIRoot;
