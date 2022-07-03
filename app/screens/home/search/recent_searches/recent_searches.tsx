// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import RecentItem, {RECENT_LABEL_HEIGHT} from './recent_item';

import type TeamModel from '@typings/database/models/servers/team';
import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const RECENT_SEPARATOR_HEIGHT = 3;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
            marginHorizontal: 15,
        },
        title: {
            padding: 20,
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
        },
        recentItemContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: RECENT_LABEL_HEIGHT,
        },
        recentItemLabel: {
            color: theme.centerChannelColor,
            fontSize: 14,
            height: 20,
            flex: 1,
            paddingHorizontal: 16,
        },
        recentRemove: {
            alignItems: 'center',
            height: RECENT_LABEL_HEIGHT,
            justifyContent: 'center',
            width: 50,
        },
        separatorContainer: {
            justifyContent: 'center',
            flex: 1,
            height: RECENT_SEPARATOR_HEIGHT,
        },
        postsSeparator: {
            height: 15,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
    };
});

type Props = {
    setRecentValue: (value: string) => void;
    recentSearches: TeamSearchHistoryModel[];
    team: TeamModel[];
}

const RecentSearches = ({setRecentValue, recentSearches, team}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleFromTheme(theme);

    const teamName = team[0].displayName;
    const title = intl.formatMessage({
        id: 'smobile.search.recent_title',
        defaultMessage: 'Recent searches in {teamName}',
    }, {
        teamName,
    });

    const renderRecentItem = useCallback(({item}) => {
        return (
            <RecentItem
                item={item}
                setRecentValue={setRecentValue}
            />
        );
    }, [setRecentValue]);

    const renderHeader = () => {
        return (
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
    };

    const data = useMemo(() => {
        return recentSearches;
    }, [recentSearches]);

    return (
        <AnimatedFlatList
            data={data}
            keyboardShouldPersistTaps='always'
            keyboardDismissMode='interactive'
            ListHeaderComponent={renderHeader}
            renderItem={renderRecentItem}
            scrollEventThrottle={60}
            testID='search.recents_list'

            //removeClippedSubviews={true}
            // stickySectionHeadersEnabled={Platform.OS === 'ios'}
            // onViewableItemsChanged={onViewableItemsChanged}
        />
    );
};

export default RecentSearches;
