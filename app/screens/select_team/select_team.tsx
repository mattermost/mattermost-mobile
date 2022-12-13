// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchAllTeams} from '@actions/remote/team';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
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

const LOAD_MORE_THRESHOLD = 10;

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

    const page = useRef(0);
    const hasMore = useRef(true);

    const mounted = useRef(false);

    const [otherTeams, setOtherTeams] = useState<Team[]>([]);

    const loadTeams = useCallback(async (alreadyLoaded = 0) => {
        const {teams, error} = await fetchAllTeams(serverUrl, page.current, PER_PAGE_DEFAULT);
        if (!mounted.current) {
            return;
        }

        page.current += 1;
        if (error || !teams || teams.length < PER_PAGE_DEFAULT) {
            hasMore.current = false;
        }

        if (error) {
            setLoading(false);
            return;
        }

        if (teams?.length) {
            setOtherTeams((prev) => [...prev, ...teams]);

            if (teams.length < PER_PAGE_DEFAULT) {
                hasMore.current = false;
            }

            if (
                hasMore.current &&
                (teams.length + alreadyLoaded > LOAD_MORE_THRESHOLD)
            ) {
                loadTeams(teams.length);
                return;
            }
        }

        setLoading(false);
    }, [serverUrl]);

    const onEndReached = useCallback(() => {
        if (hasMore.current && !loading) {
            loadTeams();
        }
    }, [loadTeams, loading]);

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
        loadTeams();
    }, []);

    let body;
    if (loading && !otherTeams.length) {
        body = null;
    } else if (otherTeams.length) {
        body = (
            <TeamList
                teams={otherTeams}
                onEndReached={onEndReached}
                loading={loading}
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
