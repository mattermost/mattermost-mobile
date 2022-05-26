// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchAllTeams} from '@actions/remote/team';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {resetToHome} from '../navigation';

import Header from './header';
import NoTeams from './no_teams';
import TeamList from './team_list';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
    },
}));

type Props = {
    nTeams: number;
}

const safeAreaEdges = ['left' as const, 'right' as const];
const safeAreaStyle = {flex: 1};

const SelectTeam = ({
    nTeams,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();
    const top = useAnimatedStyle(() => {
        return {height: insets.top, backgroundColor: theme.sidebarBg};
    });

    const mounted = useRef(false);

    const [otherTeams, setOtherTeams] = useState<Team[]>();

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (nTeams > 0) {
            resetToHome();
        }
    }, [nTeams > 0]);

    useEffect(() => {
        // eslint-disable-next-line max-nested-callbacks
        fetchAllTeams(serverUrl, false).then((r) => {
            if (mounted.current) {
                setOtherTeams(r.teams || []);
            }
        // eslint-disable-next-line max-nested-callbacks
        }).finally(() => {
            if (mounted.current) {
                setLoading(false);
            }
        });
    }, []);

    let body;
    if (loading) {
        body = null;
    } else if (otherTeams?.length) {
        body = (
            <TeamList
                teams={otherTeams}
            />
        );
    } else {
        body = (<NoTeams/>);
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
