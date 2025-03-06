// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {addCurrentUserToTeam, fetchTeamsForComponent, handleTeamChange} from '@actions/remote/team';
import FormattedText from '@components/formatted_text';
import Empty from '@components/illustrations/no_team';
import Loading from '@components/loading';
import TeamList from '@components/team_list';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {dismissModal} from '@screens/navigation';
import {logDebug} from '@utils/log';
import {alertTeamAddError} from '@utils/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    joinedIds: Set<string>;
    componentId: AvailableScreens;
    closeButtonId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        flex: 1,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: theme.centerChannelColor,
        marginTop: 16,
        ...typography('Heading', 400, 'Regular'),
    },
    description: {
        color: theme.centerChannelColor,
        marginTop: 8,
        maxWidth: 334,
        ...typography('Body', 200, 'Regular'),
    },
}));

export default function JoinTeam({
    joinedIds,
    componentId,
    closeButtonId,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const page = useRef(0);
    const hasMore = useRef(true);
    const mounted = useRef(true);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [otherTeams, setOtherTeams] = useState<Team[]>([]);

    const loadTeams = useCallback(async () => {
        setLoading(true);
        const resp = await fetchTeamsForComponent(serverUrl, page.current, joinedIds);
        page.current = resp.page;
        hasMore.current = resp.hasMore;
        if (resp.teams.length && mounted.current) {
            const teams = resp.teams.filter((t) => t.delete_at === 0);
            setOtherTeams((cur) => [...cur, ...teams]);
        }
        setLoading(false);
    }, [joinedIds, serverUrl]);

    const onEndReached = useCallback(() => {
        if (hasMore.current && !loading) {
            loadTeams();
        }
    }, [loadTeams, loading]);

    const onPress = useCallback(async (teamId: string) => {
        setJoining(true);
        const {error} = await addCurrentUserToTeam(serverUrl, teamId);
        if (error) {
            alertTeamAddError(error, intl);
            logDebug('error joining a team:', error);
            setJoining(false);
        } else {
            handleTeamChange(serverUrl, teamId);
            dismissModal({componentId});
        }
    }, [serverUrl, componentId, intl]);

    useEffect(() => {
        loadTeams();
        return () => {
            mounted.current = false;
        };
    }, []);

    const onClosePressed = useCallback(() => {
        return dismissModal({componentId});
    }, [componentId]);

    useNavButtonPressed(closeButtonId, componentId, onClosePressed, []);
    useAndroidHardwareBackHandler(componentId, onClosePressed);

    const hasOtherTeams = Boolean(otherTeams.length);

    let body;
    if ((loading && !hasOtherTeams) || joining) {
        body = (<Loading containerStyle={styles.loading}/>);
    } else if (hasOtherTeams) {
        body = (
            <TeamList
                teams={otherTeams}
                onPress={onPress}
                testID='team_sidebar.add_team_slide_up.team_list'
                onEndReached={onEndReached}
                loading={loading}
            />
        );
    } else {
        body = (
            <View style={styles.empty}>
                <Empty theme={theme}/>
                <FormattedText
                    id='team_list.no_other_teams.title'
                    defaultMessage='No additional teams to join'
                    style={styles.title}
                    testID='team_sidebar.add_team_slide_up.no_other_teams.title'
                />
                <FormattedText
                    id='team_list.no_other_teams.description'
                    defaultMessage='To join another team, ask a Team Admin for an invitation, or create your own team.'
                    style={styles.description}
                    testID='team_sidebar.add_team_slide_up.no_other_teams.description'
                />
            </View>
        );
    }

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={styles.container}
        >
            {body}
        </View>
    );
}
