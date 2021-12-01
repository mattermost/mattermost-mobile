// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {fetchAllTeams} from '@actions/remote/team';
import {TEAM_SIDEBAR_WIDTH} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import AddTeam from './add_team/add_team';
import TeamList from './team_list';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    canCreateTeams: boolean;
    iconPad?: boolean;
    otherTeams: TeamModel[];
    teamsCount: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            width: TEAM_SIDEBAR_WIDTH,
            height: '100%',
            backgroundColor: theme.sidebarBg,
            paddingTop: 10,
        },
        listContainer: {
            backgroundColor: theme.sidebarTeamBarBg,
            borderTopRightRadius: 12,
            flex: 1,
        },
        iconMargin: {
            marginTop: 44,
        },
    };
});

export default function TeamSidebar({canCreateTeams, iconPad, otherTeams, teamsCount}: Props) {
    const showAddTeam = canCreateTeams || otherTeams.length > 0;
    const initialWidth = teamsCount > 1 ? TEAM_SIDEBAR_WIDTH : 0;
    const width = useSharedValue(initialWidth);
    const marginTop = useSharedValue(iconPad ? 44 : 0);
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const transform = useAnimatedStyle(() => {
        return {
            width: withTiming(width.value, {duration: 350}),
        };
    }, []);

    const serverStyle = useAnimatedStyle(() => ({
        marginTop: withTiming(marginTop.value, {duration: 350}),
    }), []);

    useEffect(() => {
        marginTop.value = iconPad ? 44 : 0;
    }, [iconPad]);

    useEffect(() => {
        fetchAllTeams(serverUrl);
    }, [serverUrl]);

    useEffect(() => {
        width.value = teamsCount > 1 ? TEAM_SIDEBAR_WIDTH : 0;
    }, [teamsCount]);

    return (
        <Animated.View style={[styles.container, transform]}>
            <Animated.View style={[styles.listContainer, serverStyle]}>
                <TeamList/>
                {showAddTeam && (
                    <AddTeam
                        canCreateTeams={canCreateTeams}
                        otherTeams={otherTeams}
                    />
                )}
            </Animated.View>
        </Animated.View>
    );
}
