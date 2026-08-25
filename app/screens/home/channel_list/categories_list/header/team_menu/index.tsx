// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import SlideUpPanelItem from '@components/slide_up_panel_item';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';
import {confirmLeaveTeam, openJoinTeamModal} from '@utils/team_menu';

type Props = {
    canJoinOtherTeams: boolean;
    hasMoreThanOneTeam: boolean;
    currentTeamId: string;
    currentTeamDisplayName: string;
}

const TeamMenu = ({canJoinOtherTeams, hasMoreThanOneTeam, currentTeamId, currentTeamDisplayName}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onJoinAnotherTeam = useCallback(async () => {
        await dismissBottomSheet();
        openJoinTeamModal();
    }, []);

    const onLeaveTeam = useCallback(async () => {
        await dismissBottomSheet();
        confirmLeaveTeam(intl, serverUrl, currentTeamId, currentTeamDisplayName);
    }, [intl, serverUrl, currentTeamId, currentTeamDisplayName]);

    return (
        <>
            {canJoinOtherTeams && (
                <SlideUpPanelItem
                    leftIcon='account-multiple-plus-outline'
                    onPress={onJoinAnotherTeam}
                    testID='team_menu.join_another_team'
                    text={intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'})}
                />
            )}
            {hasMoreThanOneTeam && (
                <SlideUpPanelItem
                    destructive={true}
                    leftIcon='exit-to-app'
                    onPress={onLeaveTeam}
                    testID='team_menu.leave_team'
                    text={intl.formatMessage({id: 'mobile.team_menu.leave_team', defaultMessage: 'Leave team'})}
                />
            )}
        </>
    );
};

export default TeamMenu;
