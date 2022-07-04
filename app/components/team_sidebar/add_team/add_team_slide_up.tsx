// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {addUserToTeam, handleTeamChange} from '@actions/remote/team';
import FormattedText from '@components/formatted_text';
import Empty from '@components/illustrations/no_team';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

import TeamList from './team_list';

import type TeamModel from '@typings/database/models/servers/team';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexShrink: 1,
    },
    contentContainer: {
        marginBottom: 4,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: 'Metropolis',
        fontSize: 20,
        color: theme.centerChannelColor,
        lineHeight: 28,
        marginTop: 16,
    },
    description: {
        fontFamily: 'Open Sans',
        fontSize: 16,
        color: theme.centerChannelColor,
        lineHeight: 24,
        marginTop: 8,
        maxWidth: 334,
    },
}));

type Props = {
    currentUserId: string;
    otherTeams: TeamModel[];
    showTitle?: boolean;
}

export default function AddTeamSlideUp({currentUserId, otherTeams, showTitle = true}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const testID = 'team_sidebar.add_team_slide_up';

    const onPressCreate = useCallback(() => {
        //TODO Create team screen https://mattermost.atlassian.net/browse/MM-43622
        dismissBottomSheet();
    }, []);

    const onTeamAdded = useCallback(async (teamId: string) => {
        const {error} = await addUserToTeam(serverUrl, teamId, currentUserId);
        if (!error) {
            await dismissBottomSheet();
            handleTeamChange(serverUrl, teamId);
        }
    }, [serverUrl]);

    const hasOtherTeams = otherTeams.length;

    return (
        <BottomSheetContent
            buttonIcon='plus'
            buttonText={intl.formatMessage({id: 'mobile.add_team.create_team', defaultMessage: 'Create a new team'})}
            onPress={onPressCreate}
            showButton={false}
            showTitle={showTitle}
            testID={testID}
            title={intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'})}
        >
            {hasOtherTeams &&
                <TeamList
                    teams={otherTeams}
                    onPress={onTeamAdded}
                    testID='team_sidebar.add_team_slide_up.team_list'
                />
            }
            {!hasOtherTeams &&
                <View style={styles.empty}>
                    <Empty theme={theme}/>
                    <FormattedText
                        id='team_list.no_other_teams.title'
                        defaultMessage='No additional teams to join'
                        style={styles.title}
                        testID={`${testID}.no_other_teams.title`}
                    />
                    <FormattedText
                        id='team_list.no_other_teams.description'
                        defaultMessage='To join another team, ask a Team Admin for an invitation, or create your own team.'
                        style={styles.description}
                        testID={`${testID}.no_other_teams.description`}
                    />
                </View>
            }
        </BottomSheetContent>
    );
}
