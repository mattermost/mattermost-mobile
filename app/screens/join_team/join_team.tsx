// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View} from 'react-native';

import {addCurrentUserToTeam, fetchAllTeams, handleTeamChange} from '@actions/remote/team';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import FormattedText from '@components/formatted_text';
import Empty from '@components/illustrations/no_team';
import Loading from '@components/loading';
import TeamList from '@components/team_list';
import {ServerErrors} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal} from '@screens/navigation';
import {isServerError} from '@utils/errors';
import {logDebug} from '@utils/log';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    joinedIds: Set<string>;
    componentId: string;
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
        setJoining(true);
        const {error} = await addCurrentUserToTeam(serverUrl, teamId);
        if (error) {
            let errMsg;
            if (isServerError(error) && error.server_error_id === ServerErrors.TEAM_MEMBERSHIP_DENIAL_ERROR_ID) {
                errMsg = intl.formatMessage({
                    id: 'join_team.error.group_error',
                    defaultMessage: 'You need to be a member of a linked group to join this team.',
                });
            } else {
                errMsg = intl.formatMessage({id: 'join_team.error.message', defaultMessage: 'There has been an error joining the team'});
            }

            Alert.alert(
                intl.formatMessage({id: 'join_team.error.title', defaultMessage: 'Error joining a team'}),
                errMsg,
            );
            logDebug('error joining a team:', error);
            setJoining(false);
        } else {
            handleTeamChange(serverUrl, teamId);
            dismissModal({componentId});
        }
    }, [serverUrl, componentId]);

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
        <View style={styles.container}>
            {body}
        </View>
    );
}
