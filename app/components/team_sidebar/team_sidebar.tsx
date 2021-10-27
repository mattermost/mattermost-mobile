// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {fetchAllTeams} from '@actions/remote/team';
import {TEAM_SIDEBAR_WIDTH} from '@constants/view';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import AddTeam from './add_team/add_team';
import ServerIcon from './server_icon/server_icon';
import TeamList from './team_list';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    canCreateTeams: boolean;
    otherTeams: TeamModel[];
    myTeamsCount: number;
}

export default function TeamSidebar({canCreateTeams, otherTeams, myTeamsCount}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    useEffect(() => {
        fetchAllTeams(serverUrl);
    }, [serverUrl]);

    const showAddTeam = canCreateTeams || otherTeams.length > 0;

    const transform = useAnimatedStyle(() => {
        const showTeams = showAddTeam || myTeamsCount > 1;
        if (showTeams) {
            return {
                transform: [{translateX: withTiming(0, {duration: 100})}],
            };
        }
        return {
            transform: [{translateX: withTiming(-TEAM_SIDEBAR_WIDTH, {duration: 100})}],
        };
    }, [showAddTeam || myTeamsCount > 1]);

    return (
        <View style={styles.container}>
            <ServerIcon/>
            <Animated.View style={[styles.listContainer, transform]}>
                <TeamList/>
                {showAddTeam && (
                    <AddTeam
                        canCreateTeams={canCreateTeams}
                        otherTeams={otherTeams}
                    />
                )}
            </Animated.View>
        </View>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            width: TEAM_SIDEBAR_WIDTH,
            height: '100%',
            backgroundColor: theme.sidebarBg,
            display: 'flex',
        },
        listContainer: {
            backgroundColor: theme.sidebarTeamBarBg,
            borderTopRightRadius: 12,
            flex: 1,
        },
    };
});
