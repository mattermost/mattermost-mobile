// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, type ListRenderItemInfo, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import RecentItem from './recent_item';

import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
            marginVertical: 15,
            marginHorizontal: 20,
        },
        title: {
            paddingHorizontal: 20,
            paddingVertical: 12,
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
        },
    };
});

type Props = {
    setRecentValue: (value: string) => void;
    recentSearches: TeamSearchHistoryModel[];
    teamName: string;
}

const RecentSearches = ({setRecentValue, recentSearches, teamName}: Props) => {
    const theme = useTheme();
    const {formatMessage} = useIntl();
    const styles = getStyleFromTheme(theme);

    const title = formatMessage({
        id: 'smobile.search.recent_title',
        defaultMessage: 'Recent searches in {teamName}',
    }, {
        teamName,
    });

    const renderRecentItem = useCallback(({item}: ListRenderItemInfo<TeamSearchHistoryModel>) => {
        return (
            <RecentItem
                item={item}
                setRecentValue={setRecentValue}
            />
        );
    }, [setRecentValue]);

    const header = (
        <>
            <View style={styles.divider}/>
            <Text
                style={styles.title}
                numberOfLines={2}
            >
                {title}
            </Text>
        </>
    );

    return (
        <AnimatedFlatList
            data={recentSearches}
            keyboardShouldPersistTaps='always'
            keyboardDismissMode='interactive'
            ListHeaderComponent={header}
            renderItem={renderRecentItem}
            testID='search.recents_list'
            removeClippedSubviews={true}
        />
    );
};

export default RecentSearches;
