// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {handleTeamChange} from '@actions/remote/team';
import TeamFlatList from '@components/team_sidebar/add_team/team_list';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {resetToHome} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import AddTeamItem from './add_team_item';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
        marginHorizontal: 24,
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
    title: {
        color: theme.sidebarHeaderTextColor,
        marginTop: 40,
        ...typography('Heading', 800),
    },
    description: {
        color: changeOpacity(theme.sidebarText, 0.72),
        marginTop: 12,
        marginBottom: 25,
        ...typography('Body', 200, 'Regular'),
    },
    plusIcon: {
        color: theme.sidebarText,
        lineHeight: 22,
    },
    separator: {
        borderColor: changeOpacity(theme.sidebarText, 0.08),
        borderTopWidth: 1,
    },
}));

type Props = {
    canCreateTeam: boolean;
    teams: Team[];
};
function TeamList({
    canCreateTeam,
    teams,
}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onTeamAdded = async (id: string) => {
        await handleTeamChange(serverUrl, id);
        resetToHome();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{intl.formatMessage({id: 'select_team.title', defaultMessage: 'Select a team'})}</Text>
                <Text style={styles.description}>{intl.formatMessage({id: 'select_team.description', defaultMessage: 'You are not yet a member of any teams. Select one below to get started.'})}</Text>
            </View>
            {canCreateTeam && (
                <>
                    <AddTeamItem/>
                    <View style={styles.separator}/>
                </>
            )}
            <TeamFlatList
                teams={teams}
                textColor={theme.sidebarText}
                iconBackgroundColor={changeOpacity(theme.sidebarText, 0.16)}
                iconTextColor={theme.sidebarText}
                onTeamAdded={onTeamAdded}
            />
        </View>
    );
}

export default TeamList;
