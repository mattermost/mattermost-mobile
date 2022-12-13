// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import {addCurrentUserToTeam, fetchAllTeams, handleTeamChange} from '@actions/remote/team';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import FormattedText from '@components/formatted_text';
import Empty from '@components/illustrations/no_team';
import Loading from '@components/loading';
import TeamList from '@components/team_list';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {popTopScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {joinedIds: Set<string>}
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
    title: {
        color: theme.centerChannelColor,
        lineHeight: 28,
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

const LOAD_MORE_THRESHOLD = 10;

export default function JoinTeam({joinedIds}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const page = useRef(0);
    const hasMore = useRef(true);
    const [loading, setLoading] = useState(true);
    const [otherTeams, setOtherTeams] = useState<Team[]>([]);

    const loadTeams = useCallback(async (alreadyLoaded = 0) => {
        const {teams, error} = await fetchAllTeams(serverUrl, page.current, PER_PAGE_DEFAULT);
        page.current += 1;
        if (error || !teams || teams.length < PER_PAGE_DEFAULT) {
            hasMore.current = false;
        }

        if (error) {
            setLoading(false);
            return;
        }

        if (teams?.length) {
            const notJoinedTeams = teams.filter((t) => !joinedIds.has(t.id));
            setOtherTeams((prev) => [...prev, ...notJoinedTeams]);

            if (teams.length < PER_PAGE_DEFAULT) {
                hasMore.current = false;
            }

            if (
                hasMore.current &&
                (notJoinedTeams.length + alreadyLoaded > LOAD_MORE_THRESHOLD)
            ) {
                loadTeams(notJoinedTeams.length);
                return;
            }
        }

        setLoading(false);
    }, [joinedIds, serverUrl]);

    const onEndReached = useCallback(() => {
        if (hasMore.current && !loading) {
            loadTeams();
        }
    }, [loadTeams, loading]);

    const onPress = useCallback(async (teamId: string) => {
        const {error} = await addCurrentUserToTeam(serverUrl, teamId);
        if (!error) {
            handleTeamChange(serverUrl, teamId);
            popTopScreen();
        }
    }, [serverUrl]);

    useEffect(() => {
        loadTeams();
    }, []);

    const hasOtherTeams = Boolean(otherTeams.length);

    let body;
    if (loading && !hasOtherTeams) {
        body = (<Loading/>);
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
        <View style={styles.container}>
            {body}
        </View>
    );
}
