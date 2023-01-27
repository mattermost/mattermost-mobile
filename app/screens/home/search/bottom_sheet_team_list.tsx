// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import TeamList from '@components/team_list';
import {useIsTablet} from '@hooks/device';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    teams: TeamModel[];
    teamId: string;
    setTeamId: (teamId: string) => void;
    title: string;
}

export default function BottomSheetTeamList({teams, title, setTeamId, teamId}: Props) {
    const isTablet = useIsTablet();
    const showTitle = !isTablet && Boolean(teams.length);

    const onPress = useCallback((newTeamId: string) => {
        setTeamId(newTeamId);
        dismissBottomSheet();
    }, [setTeamId]);

    return (
        <BottomSheetContent
            showButton={false}
            showTitle={showTitle}
            testID='search.select_team_slide_up'
            title={title}
        >
            <TeamList
                selectedTeamId={teamId}
                teams={teams}
                onPress={onPress}
                testID='search.select_team_slide_up.team_list'
                type={isTablet ? 'FlatList' : 'BottomSheetFlatList'}
            />
        </BottomSheetContent>
    );
}
