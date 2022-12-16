// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {addCurrentUserToTeam, fetchAllTeams, handleTeamChange} from '@actions/remote/team';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {logDebug} from '@utils/log';
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
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

type Props = {
    nTeams: number;
    firstTeamId?: string;
}

const safeAreaEdges = ['left' as const, 'right' as const];
const safeAreaStyle = {flex: 1};

const LOAD_MORE_THRESHOLD = 10;

const SelectTeam = ({
    nTeams,
    firstTeamId,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const resettingToHome = useRef(false);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
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

    const onTeamPressed = async (teamId: string) => {
        setJoining(true);
        const {error} = await addCurrentUserToTeam(serverUrl, teamId);
        if (error) {
            Alert.alert(
                intl.formatMessage({id: 'join_team.error.title', defaultMessage: 'Error joining a team'}),
                intl.formatMessage({id: 'join_team.error.message', defaultMessage: 'There has been an error joining the team'}),
            );
            logDebug('error joining a team:', error);
            setJoining(false);
        }

        // Back to home handled in an effect
    };

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (resettingToHome.current) {
            return;
        }

        if ((nTeams > 0) && firstTeamId) {
            resettingToHome.current = true;
            handleTeamChange(serverUrl, firstTeamId).then(() => {
                resetToHome();
            });
        }
    }, [(nTeams > 0) && firstTeamId]);

    useEffect(() => {
        loadTeams();
    }, []);

    let body;
    if (joining || (loading && !otherTeams.length)) {
        body = <Loading containerStyle={styles.loading}/>;
    } else if (otherTeams.length) {
        body = (
            <TeamList
                teams={otherTeams}
                onEndReached={onEndReached}
                onPress={onTeamPressed}
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
