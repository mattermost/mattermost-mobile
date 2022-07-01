// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, FlatList, View} from 'react-native';
import Animated from 'react-native-reanimated';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import RecentItem, {RECENT_LABEL_HEIGHT, RecentItemType} from './recent_item';

import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const RECENT_SEPARATOR_HEIGHT = 3;

type Props = {
    setSearchValue: (value: string) => void;
    teamId: string;
    recentSearches: TeamSearchHistoryModel[];
    handleSearch: () => void;
}

const RecentSearches = ({setSearchValue, recentSearches, teamId, handleSearch}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const formatMessage = intl.formatMessage;
    const [recentValues, setRecent] = useState([]);

    const styles = getStyleFromTheme(theme);

    const renderRecentItem = ({item}) => {
        return (
            <RecentItem
                item={item}
                teamId={teamId}
                setSearchValue={setSearchValue}
            />
        );
    };

    const setRecentValue = preventDoubleTap(({recentNew}: RecentItemType) => {
        const {terms, isOrSearch} = recentNew;
        setSearchValue(terms);

        // search(terms, isOrSearch);
        Keyboard.dismiss();
    });

    const renderHeader = () => {
        return (
            <>
                <View style={styles.divider}/>
                <FormattedText
                    style={styles.title}
                    id={'screen.search.recent.header'}
                    defaultMessage={formatMessage({id: 'mobile.search.recent_title', defaultMessage: 'Recent searches'})}
                />
            </>
        );
    };

    const data = recentSearches.map((c) => ({terms: c.term}));
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

export default RecentSearches;
