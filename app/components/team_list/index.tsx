// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo} from 'react';
import {type ListRenderItemInfo, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler'; // Keep the FlatList from gesture handler so it works well with bottom sheet

import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexGrow: 1,
        },
        contentContainer: {
            marginBottom: 4,
        },
        separator: {
            height: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
    };
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
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {enabled, panResponder} = useBottomSheetListsFix();

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
                <View
                    style={styles.separator}
                    testID={`team_list.separator-${i}`}
                />
            </>);
        }
        return teamListItem;
    }, [textColor, iconTextColor, iconBackgroundColor, onPress, selectedTeamId, hideIcon, separatorAfterFirstItem, styles.separator]);

    let footer;
    if (loading) {
        footer = (<Loading testID='team_list.loading'/>);
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
                scrollEnabled={teams.length > 3 && enabled}
                {...panResponder.panHandlers}
            />
        </View>
    );
}
