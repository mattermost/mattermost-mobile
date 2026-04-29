// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {removeCurrentUserFromTeam} from '@actions/remote/team';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {showModal} from '@screens/navigation';

import type {IntlShape} from 'react-intl';

export function openJoinTeamModal(intl: IntlShape, theme: Theme) {
    const title = intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'});
    const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
    const closeButtonId = 'close-join-team';
    const options = {
        topBar: {
            leftButtons: [{
                id: closeButtonId,
                icon: closeButton,
                testID: 'close.join_team.button',
            }],
        },
    };
    showModal(Screens.JOIN_TEAM, title, {closeButtonId}, options);
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
