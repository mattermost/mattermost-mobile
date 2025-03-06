// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {addCurrentUserToTeam, fetchTeamsForComponent, handleTeamChange} from '@actions/remote/team';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import SecurityManager from '@managers/security_manager';
import {logDebug} from '@utils/log';
import {alertTeamAddError} from '@utils/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {resetToHome} from '../navigation';

import Header from './header';
import NoTeams from './no_teams';
import TeamList from './team_list';

import type {AvailableScreens} from '@typings/screens/navigation';

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
    componentId: AvailableScreens;
    nTeams: number;
    firstTeamId?: string;
}

const safeAreaEdges = ['left' as const, 'right' as const];
const safeAreaStyle = {flex: 1};

const SelectTeam = ({
    componentId,
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

    const loadTeams = useCallback(async () => {
        setLoading(true);
        const resp = await fetchTeamsForComponent(serverUrl, page.current);
        page.current = resp.page;
        hasMore.current = resp.hasMore;
        if (resp.teams.length && mounted.current) {
            const teams = resp.teams.filter((t) => t.delete_at === 0);
            setOtherTeams((cur) => [...cur, ...teams]);
        }
        setLoading(false);
    }, [serverUrl]);

    const onEndReached = useCallback(() => {
        if (hasMore.current && !loading) {
            loadTeams();
        }
    }, [loadTeams, loading]);

    const onTeamPressed = useCallback(async (teamId: string) => {
        setJoining(true);
        const {error} = await addCurrentUserToTeam(serverUrl, teamId);
        if (error) {
            alertTeamAddError(error, intl);
            logDebug('error joining a team:', error);

            setJoining(false);
        }

        // Back to home handled in an effect
    }, [serverUrl, intl]);

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
            nativeID={SecurityManager.getShieldScreenId(componentId)}
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
