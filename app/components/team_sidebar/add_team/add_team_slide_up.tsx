// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {addCurrentUserToTeam, handleTeamChange} from '@actions/remote/team';
import FormattedText from '@components/formatted_text';
import Empty from '@components/illustrations/no_team';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import TeamList from './team_list';

import type TeamModel from '@typings/database/models/servers/team';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
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

type Props = {
    otherTeams: TeamModel[];
    title: string;
    showTitle?: boolean;
}

export default function AddTeamSlideUp({otherTeams, title, showTitle = true}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const onPressCreate = useCallback(() => {
        //TODO Create team screen https://mattermost.atlassian.net/browse/MM-43622
        dismissBottomSheet();
    }, []);

    const onPress = useCallback(async (teamId: string) => {
        const {error} = await addCurrentUserToTeam(serverUrl, teamId);
        if (!error) {
            await dismissBottomSheet();
            handleTeamChange(serverUrl, teamId);
        }
    }, [serverUrl]);

    const hasOtherTeams = Boolean(otherTeams.length);

    return (
        <BottomSheetContent
            buttonIcon='plus'
            buttonText={intl.formatMessage({id: 'mobile.add_team.create_team', defaultMessage: 'Create a new team'})}
            onPress={onPressCreate}
            showButton={false}
            showTitle={showTitle}
            testID={'team_sidebar.add_team_slide_up'}
            title={title}
        >
            {hasOtherTeams &&
                <TeamList
                    teams={otherTeams}
                    onPress={onPress}
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
                        testID={'team_sidebar.add_team_slide_up.no_other_teams.title'}
                    />
                    <FormattedText
                        id='team_list.no_other_teams.description'
                        defaultMessage='To join another team, ask a Team Admin for an invitation, or create your own team.'
                        style={styles.description}
                        testID={'team_sidebar.add_team_slide_up.no_other_teams.description'}
                    />
                </View>
            }
        </BottomSheetContent>
    );
}
