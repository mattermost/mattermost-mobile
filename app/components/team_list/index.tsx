// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo} from 'react';
import {type ListRenderItemInfo, StyleSheet, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler'; // Keep the FlatList from gesture handler so it works well with bottom sheet

import Loading from '@components/loading';

import TeamListItem from './team_list_item';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    iconBackgroundColor?: string;
    iconTextColor?: string;
    loading?: boolean;
    onEndReached?: () => void;
    onPress: (id: string) => void;
    selectedTeamId?: string;
    teams: Array<Team|TeamModel>;
    testID?: string;
    textColor?: string;
    type?: BottomSheetList;
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
    },
    contentContainer: {
        marginBottom: 4,
    },
});

const keyExtractor = (item: TeamModel) => item.id;

export default function TeamList({
    iconBackgroundColor,
    iconTextColor,
    loading = false,
    onEndReached,
    onPress,
    selectedTeamId,
    teams,
    testID,
    textColor,
    type = 'FlatList',
}: Props) {
    const List = useMemo(() => (type === 'FlatList' ? FlatList : BottomSheetFlatList), [type]);

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
            <List
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
