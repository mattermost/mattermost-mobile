// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';

import TeamList from './team_list';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    otherTeams: TeamModel[];
    canCreateTeams: boolean;
    showTitle?: boolean;
}

export default function AddTeamSlideUp({otherTeams, canCreateTeams, showTitle = true}: Props) {
    const intl = useIntl();

    const onPressCreate = useCallback(() => {
        //TODO Create team screen
        dismissBottomSheet();
    }, []);

    return (
        <BottomSheetContent
            buttonIcon='plus'
            buttonText={intl.formatMessage({id: 'mobile.add_team.create_team', defaultMessage: 'Create a New Team'})}
            onPress={onPressCreate}
            showButton={canCreateTeams}
            showTitle={showTitle}
            title={intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'})}
        >
            <TeamList teams={otherTeams}/>
        </BottomSheetContent>
    );
}
