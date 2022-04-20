// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchAllTeams} from '@actions/remote/team';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {resetToHome} from '../navigation';

import Header from './header';
import NoTeams from './no_teams';
import TeamList from './team_list';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
    },
    body: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 24,
    },
    iconWrapper: {
        height: 120,
        width: 120,
        backgroundColor: changeOpacity(theme.sidebarText, 0.08),
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 72,
        lineHeight: 72,
        color: changeOpacity(theme.sidebarText, 0.48),
    },
    bodyTitle: {
        color: theme.sidebarHeaderTextColor,
        marginTop: 24,
        textAlign: 'center',
        ...typography('Heading', 800),
    },
    bodyDescription: {
        color: changeOpacity(theme.sidebarText, 0.72),
        textAlign: 'center',
        marginTop: 12,
        ...typography('Body', 200, 'Regular'),
    },
    buttonStyle: {
        ...StyleSheet.flatten(buttonBackgroundStyle(theme, 'lg', 'primary', 'default')),
        flexDirection: 'row',
        marginTop: 24,
    },
    buttonText: {
        ...StyleSheet.flatten(buttonTextStyle(theme, 'lg', 'primary', 'default')),
        marginLeft: 8,
    },
    plusIcon: {
        color: theme.sidebarText,
        lineHeight: 22,
    },

}));

type Props = {
    canCreateTeams: boolean;
}

const findActiveMemberships = (m: TeamMembership) => m.delete_at === 0;

const safeAreaEdges = ['left' as const, 'right' as const];
const safeAreaStyle = {flex: 1};

const SelectTeam = ({
    canCreateTeams = true,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();
    const top = useAnimatedStyle(() => {
        return {height: insets.top, backgroundColor: theme.sidebarBg};
    });

    const [otherTeams, setOtherTeams] = useState<Team[]>();
    useEffect(() => {
        // eslint-disable-next-line max-nested-callbacks
        fetchAllTeams(serverUrl, false).then((r) => {
            if (r.memberships?.find(findActiveMemberships)) {
                resetToHome();
                return;
            }
            setOtherTeams(r.teams || []);
        // eslint-disable-next-line max-nested-callbacks
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    let body;
    if (loading) {
        body = null;
    } else if (otherTeams?.length) {
        body = (
            <TeamList
                teams={otherTeams}
                canCreateTeam={canCreateTeams}
            />
        );
    } else {
        body = (<NoTeams canCreateTeams={canCreateTeams}/>);
    }
    return (
        <SafeAreaView
            mode='margin'
            edges={safeAreaEdges}
            style={safeAreaStyle}
        >
            <Animated.View style={top}/>
            <View style={styles.container}>
                <Header/>
                {body}
            </View>
        </SafeAreaView>
    );
};

export default SelectTeam;
