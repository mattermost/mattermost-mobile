// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Navigation, Options} from 'react-native-navigation';

import {Screens} from '@constants';

export const appearanceControlledScreens = new Set([Screens.SERVER, Screens.LOGIN, Screens.FORGOT_PASSWORD, Screens.MFA, Screens.SSO]);

export function mergeNavigationOptions(componentId: string, options: Options) {
    Navigation.mergeOptions(componentId, options);
}
