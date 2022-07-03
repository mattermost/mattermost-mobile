// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import TeamList from '@components/team_sidebar/add_team/team_list';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    otherTeams: TeamModel[];
    showTitle?: boolean;
    teamId: string;
    setTeamId: (teamId: string) => void;
}

export default function SelectTeamSlideUp({otherTeams, showTitle = true, setTeamId, teamId}: Props) {
    const intl = useIntl();
    const testID = 'team_sidebar.add_team_slide_up';

    const onPress = useCallback((newTeamId: string) => {
        setTeamId(newTeamId);
        dismissBottomSheet();
    }, [setTeamId]);

    const hasOtherTeams = otherTeams.length;
    return (
        <BottomSheetContent
            showButton={false}
            showTitle={showTitle}
            testID={testID}
            title={intl.formatMessage({id: 'mobile.search.team.select', defaultMessage: 'Select a team to search'})}
        >
            {hasOtherTeams &&
                <TeamList
                    selectedTeamId={teamId}
                    teams={otherTeams}
                    onPress={onPress}
                    testID='team_sidebar.add_team_slide_up.team_list'
                />
            }
        </BottomSheetContent>
    );
}
