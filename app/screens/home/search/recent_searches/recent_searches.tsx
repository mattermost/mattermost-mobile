// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useRef, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {LayoutChangeEvent, Keyboard, Text, FlatList, View, Platform, SectionList, SectionListData} from 'react-native';
import HWKeyboardEvent from 'react-native-hw-keyboard-event';
import Animated from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import RecentItem, {RECENT_LABEL_HEIGHT, RecentItemType} from './recent_item';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

const SECTION_HEIGHT = 20;
const RECENT_SEPARATOR_HEIGHT = 3;

const emptySections: Array<SectionListData<RecentItemType | boolean>> = [];

//    static propTypes = {
//     actions: PropTypes.shape({
//         clearSearch: PropTypes.func.isRequired,
//         handleSearchDraftChanged: PropTypes.func.isRequired,
//         removeSearchTerms: PropTypes.func.isRequired,
//         searchPostsWithParams: PropTypes.func.isRequired,
//         getMorePostsForSearch: PropTypes.func.isRequired,
//     }).isRequired,
// };

type Props = {
    handleTextChanged: any;
    searchValue: string;
    recent: [];
}

const keyRecentExtractor = (item: RecentItemType) => {
    return `recent-${item.terms}`;
};

const RecentSearches = ({handleTextChanged, recent, searchValue}: Props) => {
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

    const renderSectionHeader = ({section}) => {
        const {title} = section;

        if (title) {
            return (

                // <View style={styles.sectionWrapper}>
                // <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>
                    {title}
                </Text>

            // </View>
            //  </View>
            );
        }

        return <View/>;
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
        search(terms, isOrSearch);
        Keyboard.dismiss();
    });

    const sections: typeof emptySections = [];
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

    return (
        <AnimatedSectionList

            // contentContainerStyle={paddingTop}
            // ref={scrollRef}
            //     style={style.sectionList}
            removeClippedSubviews={true}
            renderSectionHeader={renderSectionHeader}
            sections={sections}
            keyboardShouldPersistTaps='always'
            keyboardDismissMode='interactive'
            stickySectionHeadersEnabled={Platform.OS === 'ios'}

            // onLayout={handleLayout}
            // onScroll={handleScroll}
            scrollEventThrottle={60}

            // SectionSeparatorComponent={renderRecentSeparator}
            //                 onViewableItemsChanged={onViewableItemsChanged}
            testID='search.results_list'
        />
    );
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
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
        sectionTitle: {
            padding: 20,
            color: theme.centerChannel,
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

