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
    hideIcon?: boolean;
    separatorAfterFirstItem?: boolean;
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
    },
    contentContainer: {
        marginBottom: 4,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
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
    hideIcon = false,
    separatorAfterFirstItem = false,
}: Props) {
    const List = useMemo(() => (type === 'FlatList' ? FlatList : BottomSheetFlatList), [type]);

    const renderTeam = useCallback(({item: t, index: i}: ListRenderItemInfo<Team|TeamModel>) => {
        let teamListItem = (
            <TeamListItem
                onPress={onPress}
                team={t}
                textColor={textColor}
                iconBackgroundColor={iconBackgroundColor}
                iconTextColor={iconTextColor}
                selectedTeamId={selectedTeamId}
                hideIcon={hideIcon}
            />
        );
        if (separatorAfterFirstItem && i === 0) {
            teamListItem = (<>
                {teamListItem}
                <View style={styles.separator}/>
            </>);
        }
        return teamListItem;
    }, [textColor, iconTextColor, iconBackgroundColor, onPress, selectedTeamId, hideIcon, separatorAfterFirstItem]);

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
                scrollEnabled={teams.length > 3}
            />
        </View>
    );
}
