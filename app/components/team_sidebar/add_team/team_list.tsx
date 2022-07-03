// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {ListRenderItemInfo, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler'; // Keep the FlatList from gesture handler so it works well with bottom sheet

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import TeamListItem from './team_list_item';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    teams: Array<Team|TeamModel>;
    textColor?: string;
    iconTextColor?: string;
    iconBackgroundColor?: string;
    onPress: (id: string) => void;
    testID?: string;
    selectedTeamId?: string;
}

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

const keyExtractor = (item: TeamModel) => item.id;

export default function TeamList({teams, textColor, iconTextColor, iconBackgroundColor, onPress, testID, selectedTeamId}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const renderTeam = useCallback(({item: t}: ListRenderItemInfo<Team|TeamModel>) => {
        return (
            <TeamListItem
                onPress={onPress}
                team={t}
                textColor={textColor}
                iconBackgroundColor={iconBackgroundColor}
                iconTextColor={iconTextColor}
                selectedTeamId={selectedTeamId}
            />
        );
    }, [textColor, iconTextColor, iconBackgroundColor, onPress]);

    return (
        <View style={styles.container}>
            <FlatList
                data={teams}
                renderItem={renderTeam}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.contentContainer}
                testID={`${testID}.flat_list`}
            />
        </View>
    );
}
