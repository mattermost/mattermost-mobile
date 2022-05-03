// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';
import {Alert} from 'react-native';
import {Navigation, Options} from 'react-native-navigation';

import {Screens} from '@constants';

export const appearanceControlledScreens = new Set([Screens.SERVER, Screens.LOGIN, Screens.FORGOT_PASSWORD, Screens.MFA, Screens.SSO]);

export function mergeNavigationOptions(componentId: string, options: Options) {
    Navigation.mergeOptions(componentId, options);
}

export async function alertTeamRemove(displayName: string, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'alert.removed_from_team.title',
            defaultMessage: 'Removed from team',
        }),
        intl.formatMessage({
            id: 'alert.removed_from_team.description',
            defaultMessage: 'You have been removed from team {displayName}.',
        }, {displayName}),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.oauth.something_wrong.okButton', defaultMessage: 'OK'}),
        }],
    );
}
