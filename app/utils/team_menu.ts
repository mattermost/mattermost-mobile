// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {removeCurrentUserFromTeam} from '@actions/remote/team';
import {Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';

import type {IntlShape} from 'react-intl';

export function openJoinTeamModal() {
    navigateToScreen(Screens.JOIN_TEAM);
}

export function confirmLeaveTeam(intl: IntlShape, serverUrl: string, teamId: string, teamDisplayName: string) {
    const title = intl.formatMessage(
        {id: 'mobile.team_menu.leave_team_confirm_title', defaultMessage: 'Leave {teamName}?'},
        {teamName: teamDisplayName},
    );
    const message = intl.formatMessage({
        id: 'mobile.team_menu.leave_team_confirm_body',
        defaultMessage: "You'll need to be invited or join again to come back.",
    });
    Alert.alert(title, message, [
        {
            text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
            style: 'cancel',
        },
        {
            text: intl.formatMessage({id: 'mobile.team_menu.leave_team_confirm_button', defaultMessage: 'Leave'}),
            style: 'destructive',
            onPress: () => {
                removeCurrentUserFromTeam(serverUrl, teamId);
            },
        },
    ]);
}
