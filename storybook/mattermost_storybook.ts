// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Navigation} from 'react-native-navigation';
import {goToScreen} from '@actions/navigation';
import {withReduxProvider} from '@screens';

import DevMenu from 'react-native-dev-menu';
DevMenu.addItem('StoryBook', () => goToScreen('StoryBook', 'StoryBook'));

Navigation.registerComponent('StoryBook', () => withReduxProvider(require('../storybook').default));
