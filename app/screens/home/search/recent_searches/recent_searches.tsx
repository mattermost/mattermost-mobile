// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useRef, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleProp, LayoutChangeEvent, Keyboard, Text, FlatList, View, ViewStyle, Platform} from 'react-native';
import HWKeyboardEvent from 'react-native-hw-keyboard-event';
import Animated from 'react-native-reanimated';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import RecentItem, {RECENT_LABEL_HEIGHT, RecentItemType} from './recent_item';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const SECTION_HEIGHT = 20;
const RECENT_SEPARATOR_HEIGHT = 3;

// const emptySections: Array<SectionListData<RecentItemType | boolean>> = [];

type Props = {
    ref: React.RefObject<Animated.ScrollView>;
    handleTextChanged: any;
    paddingTop?: StyleProp<ViewStyle>;
    recent: [];
    searchValue: string;
}

const keyRecentExtractor = (item: RecentItemType) => {
    return `recent-${item.terms}`;
};

const RecentSearches = ({handleTextChanged, recent, searchModifiers, searchValue, paddingTop, ref}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const formatMessage = intl.formatMessage;
    const listRef = useRef(null);
    const [recentValues, setRecent] = useState(recent || []);

    const styles = getStyleFromTheme(theme);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        this.setState({searchListHeight: height});
    }, []);

    const renderRecentSeparator = () => {
        return (
            <View style={styles.separatorContainer}>
                <View style={styles.separator}/>
            </View>
        );
    };

    // TODO add useCallback
    const removeSearchTerms = preventDoubleTap((item) => {
        const {actions} = this.props;
        const newRecent = [...recentValues];
        const index = recentValues.indexOf(item);

        if (index !== -1) {
            recentValues.splice(index, 1);
            setRecent({newRecent});
        }

        actions.removeSearchTerms(currentTeamId, item.terms);
    });
    const renderRecentItem = ({item}) => {
        console.log('item', item);
        return (
            <RecentItem
                item={item}
                removeSearchTerms={removeSearchTerms}
                setRecentValue={setRecentValue}
            />
        );
    };

    const setRecentValue = preventDoubleTap(({recentNew}: RecentItemType) => {
        const {terms, isOrSearch} = recentNew;
        handleTextChanged(terms, false);

        // search(terms, isOrSearch);
        Keyboard.dismiss();
    });

    if (recentValues.length) {
        sections.push({
            data: recentValues,
            key: 'recent',
            title: formatMessage({id: 'mobile.search.recent_title', defaultMessage: 'Recent Searches'}),
            renderItem: renderRecentItem,
            keyExtractor: keyRecentExtractor,
            ItemSeparatorComponent: renderRecentSeparator,
        });
    }

    const renderHeader = () => {
        return (
            <>
                {searchModifiers}
                <View style={styles.divider}/>
                <FormattedText
                    style={styles.title}
                    id={'screen.search.recent.header'}
                    defaultMessage='Recent searches'
                />
            </>
        );
    };

    const data = [
        {terms: 'Recent Search 1'},
        {terms: 'Recent Search 2'},
        {terms: 'Recent Search 3'},
        {terms: 'Recent Search 4'},
        {terms: 'Recent Search 5'},
    ];
    return (
        <AnimatedFlatList
            contentContainerStyle={paddingTop}
            data={data}
            ref={ref}
            keyboardShouldPersistTaps='always'
            keyboardDismissMode='interactive'
            ListHeaderComponent={renderHeader}
            renderItem={renderRecentItem}
            scrollEventThrottle={60}
            testID='search.recents_list'

            //removeClippedSubviews={true}
            // stickySectionHeadersEnabled={Platform.OS === 'ios'}
            // onLayout={handleLayout}
            // onScroll={handleScroll}
            //     style={style.sectionList}
            // SectionSeparatorComponent={renderRecentSeparator}
            //                 onViewableItemsChanged={onViewableItemsChanged}
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
        sectionWrapper: {
            marginBottom: 12,
            height: 48,
            backgroundColor: theme.centerChannelBg,
        },
        sectionContainer: {
            justifyContent: 'center',
            paddingLeft: 20,
            height: SECTION_HEIGHT,
        },
        title: {
            padding: 20,
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
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
        sectionList: {
            flex: 1,
        },
    };
});

export default RecentSearches;
