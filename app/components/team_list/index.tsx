// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {ListRenderItemInfo, StyleSheet, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler'; // Keep the FlatList from gesture handler so it works well with bottom sheet

import Loading from '@components/loading';

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
    onEndReached?: () => void;
    loading?: boolean;
}

const styles = StyleSheet.create({
    container: {
        flexShrink: 1,
    },
    contentContainer: {
        marginBottom: 4,
    },
});

const keyExtractor = (item: TeamModel) => item.id;

export default function TeamList({teams, textColor, iconTextColor, iconBackgroundColor, onPress, testID, selectedTeamId, onEndReached, loading = false}: Props) {
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
    }, [textColor, iconTextColor, iconBackgroundColor, onPress, selectedTeamId]);

    let footer;
    if (loading) {
        footer = (<Loading/>);
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={teams}
                renderItem={renderTeam}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.contentContainer}
                testID={`${testID}.flat_list`}
                onEndReached={onEndReached}
                ListFooterComponent={footer}
            />
        </View>
    );
}
