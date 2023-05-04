// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import {Navigation, type Options} from 'react-native-navigation';

import {Screens, ServerErrors} from '@constants';
import {isErrorWithMessage, isServerError} from '@utils/errors';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {IntlShape} from 'react-intl';

export const appearanceControlledScreens = new Set<AvailableScreens>([
    Screens.ONBOARDING,
    Screens.SERVER,
    Screens.LOGIN,
    Screens.FORGOT_PASSWORD,
    Screens.MFA,
    Screens.SSO,
    Screens.REVIEW_APP,
    Screens.SHARE_FEEDBACK,
]);

export function mergeNavigationOptions(componentId: string, options: Options) {
    Navigation.mergeOptions(componentId, options);
}

export function alertTeamRemove(displayName: string, intl: IntlShape) {
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

export function alertChannelRemove(displayName: string, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'alert.removed_from_channel.title',
            defaultMessage: 'Removed from channel',
        }),
        intl.formatMessage({
            id: 'alert.removed_from_channel.description',
            defaultMessage: 'You have been removed from channel {displayName}.',
        }, {displayName}),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.oauth.something_wrong.okButton', defaultMessage: 'OK'}),
        }],
    );
}

export function alertChannelArchived(displayName: string, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'alert.channel_deleted.title',
            defaultMessage: 'Archived channel',
        }),
        intl.formatMessage({
            id: 'alert.channel_deleted.description',
            defaultMessage: 'The channel {displayName} has been archived.',
        }, {displayName}),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.oauth.something_wrong.okButton', defaultMessage: 'OK'}),
        }],
    );
}

export function alertTeamAddError(error: unknown, intl: IntlShape) {
    let errMsg = intl.formatMessage({id: 'join_team.error.message', defaultMessage: 'There has been an error joining the team.'});

    if (isServerError(error)) {
        if (error.server_error_id === ServerErrors.TEAM_MEMBERSHIP_DENIAL_ERROR_ID) {
            errMsg = intl.formatMessage({
                id: 'join_team.error.group_error',
                defaultMessage: 'You need to be a member of a linked group to join this team.',
            });
        } else if (isErrorWithMessage(error) && error.message) {
            errMsg = error.message;
        }
    }

    Alert.alert(
        intl.formatMessage({id: 'join_team.error.title', defaultMessage: 'Error joining a team'}),
        errMsg,
    );
}
