// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import TeamList from '@components/team_list';
import {ALL_TEAMS_ID} from '@constants/team';
import {useIsTablet} from '@hooks/device';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    teams: TeamModel[];
    teamId: string;
    setTeamId: (teamId: string) => void;
    title: string;
    crossTeamSearchEnabled: boolean;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default function BottomSheetTeamList({teams, title, setTeamId, teamId, crossTeamSearchEnabled}: Props) {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const showTitle = !isTablet && Boolean(teams.length);

    const onPress = useCallback((newTeamId: string) => {
        setTeamId(newTeamId);
        dismissBottomSheet();
    }, [setTeamId]);

    const teamList = useMemo(() => {
        const list = [...teams];
        if (crossTeamSearchEnabled) {
            list.unshift({id: ALL_TEAMS_ID, displayName: intl.formatMessage({id: 'mobile.search.team.all_teams', defaultMessage: 'All teams'})} as TeamModel);
        }
        return list;
    }, [teams, crossTeamSearchEnabled, intl]);

    return (
        <BottomSheetContent
            showButton={false}
            showTitle={showTitle}
            testID='search.select_team_slide_up'
            title={title}
        >
            <View style={styles.container} >
                <TeamList
                    selectedTeamId={teamId}
                    teams={teamList}
                    onPress={onPress}
                    testID='search.select_team_slide_up.team_list'
                    type={isTablet ? 'FlatList' : 'BottomSheetFlatList'}
                    hideIcon={true}
                    separatorAfterFirstItem={crossTeamSearchEnabled}
                />
            </View>
        </BottomSheetContent>
    );
}
