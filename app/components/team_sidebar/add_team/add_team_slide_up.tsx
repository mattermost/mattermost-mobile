// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {handleTeamChange} from '@actions/remote/team';
import {useServerUrl} from '@context/server';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';

import TeamList from './team_list';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    otherTeams: TeamModel[];
    showTitle?: boolean;
}

export default function AddTeamSlideUp({otherTeams, showTitle = true}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onPressCreate = useCallback(() => {
        //TODO Create team screen https://mattermost.atlassian.net/browse/MM-43622
        dismissBottomSheet();
    }, []);

    const onTeamAdded = useCallback(async (teamId: string) => {
        await dismissBottomSheet();
        handleTeamChange(serverUrl, teamId);
    }, [serverUrl]);

    return (
        <BottomSheetContent
            buttonIcon='plus'
            buttonText={intl.formatMessage({id: 'mobile.add_team.create_team', defaultMessage: 'Create a new team'})}
            onPress={onPressCreate}
            showButton={false}
            showTitle={showTitle}
            testID='team_sidebar.add_team_slide_up'
            title={intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'})}
        >
            <TeamList
                teams={otherTeams}
                onTeamAdded={onTeamAdded}
                testID='team_sidebar.add_team_slide_up.team_list'
            />
        </BottomSheetContent>
    );
}
