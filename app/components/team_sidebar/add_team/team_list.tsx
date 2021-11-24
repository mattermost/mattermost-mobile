// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ListRenderItemInfo, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import TeamListItem from './team_list_item';

import type TeamModel from '@typings/database/models/servers/team';

const Empty = require('./no_teams.svg').default;

type Props = {
    teams: TeamModel[];
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexShrink: 1,
    },
    contentContainer: {
        marginVertical: 4,
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

const renderTeam = ({item: t}: ListRenderItemInfo<TeamModel>) => {
    return (
        <TeamListItem
            team={t}
        />
    );
};

const keyExtractor = (item: TeamModel) => item.id;

export default function TeamList({teams}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    if (teams.length) {
        return (
            <View style={styles.container}>
                <FlatList
                    data={teams}
                    renderItem={renderTeam}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.contentContainer}
                />
            </View>
        );
    }

    return (
        <View style={styles.empty}>
            <Empty/>
            <FormattedText
                id='team_list.no_other_teams.title'
                defaultMessage='No additional teams to join'
                style={styles.title}
            />
            <FormattedText
                id='team_list.no_other_teams.description'
                defaultMessage='To join another team, ask a Team Admin for an invitation, or create your own team.'
                style={styles.description}
            />
        </View>
    );
}
