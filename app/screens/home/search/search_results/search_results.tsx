// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, View, Platform, SectionList, SectionListData} from 'react-native';
import Animated from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

const SECTION_HEIGHT = 20;
const RECENT_SEPARATOR_HEIGHT = 3;

const emptySections: Array<SectionListData<ModifierItem | boolean>> = [];

//    static propTypes = {
//     actions: PropTypes.shape({
//         clearSearch: PropTypes.func.isRequired,
//         handleSearchDraftChanged: PropTypes.func.isRequired,
//         removeSearchTerms: PropTypes.func.isRequired,
//         searchPostsWithParams: PropTypes.func.isRequired,
//         getMorePostsForSearch: PropTypes.func.isRequired,
//     }).isRequired,
// };

const keyPostExtractor = (item) => {
    return item.id || item;
};

type Props = {
    paddingTop?: any;
    results?: any;
}
const SearchResults = ({paddingTop, results}: Props) => {
    const intl = useIntl();
    const formatMessage = intl.formatMessage;
    const theme = useTheme();
    const [contentOffsetY, setContentOffsetY] = useState(0);

    // const [sections, setSections] = useState<Array<SectionListData<Channel>>>(emptySections);

    const styles = getStyleFromTheme(theme);
    const renderSectionHeader = ({section}) => {
        const {title} = section;
        if (title) {
            return (
                <Text style={styles.sectionTitle}>
                    {title}
                </Text>
            );
        }
        return <View/>;
    };

    // const getMoreSearchResults = debounce(() => {
    //     if (searchValue && postIds.length) {
    //         this.props.actions.getMorePostsForSearch();
    //     }
    // }, 100);

    // const handleScroll = (event) => {
    //     const pageOffsetY = event.nativeEvent.contentOffset.y;
    //     if (pageOffsetY > 0) {
    //         const contentHeight = event.nativeEvent.contentSize.height;
    //         const direction = (contentOffsetY < pageOffsetY) ? ListTypes.VISIBILITY_SCROLL_UP : ListTypes.VISIBILITY_SCROLL_DOWN;
    //
    //         setContentOffsetY(pageOffsetY);
    //         if (
    //             direction === ListTypes.VISIBILITY_SCROLL_UP &&
    //             (contentHeight - pageOffsetY) < (this.state.searchListHeight * SCROLL_UP_MULTIPLIER)
    //         ) {
    //             getMoreSearchResults();
    //         }
    //     }
    // };

    type archivedIndicatorType = {
        postID: string;
        style;
    }
    const archivedIndicator = ({postID, style}: archivedIndicatorType) => {
        const channelIsArchived = archivedPostIds.includes(postID);
        let indicator = null;
        if (channelIsArchived) {
            indicator = (
                <View style={style.archivedIndicator}>
                    <Text>
                        <CompassIcon
                            name='archive-outline'
                            style={style.archivedText}
                        />
                        {' '}
                        <FormattedText
                            style={style.archivedText}
                            id='search_item.channelArchived'
                            defaultMessage='Archived'
                        />
                    </Text>
                </View>
            );
        }
        return indicator;
    };

    const renderPost = ({item, index}) => {
    //     if (item.id) {
    //         return (
    //             <View style={style.customItem}>
    //                 {item.component}
    //             </View>
    //         );
    //     }
    //
    //     if (isDateLine(item)) {
    //         return (
    //             <DateSeparator
    //                 date={getDateForDateLine(item)}
    //                 theme={theme}
    //             />
    //         );
    //     }
    //
    //     let separator;
    //     const nextPost = postIds[index + 1];
    //     if (nextPost && !isDateLine(nextPost)) {
    //         separator = <PostSeparator theme={theme}/>;
    //     }
    //
        return (
            <Text>
                {'Render this post'}
            </Text>
        );

    //     return (
    //         <View style={style.postResult}>
    //             <ChannelDisplayName postId={item}/>
    //             {archivedIndicator(postIds[index], style)}
    //             <SearchResultPost
    //                 postId={item}
    //                 skipPinnedHeader={true}
    //                 theme={theme}
    //             />
    //             {separator}
    //         </View>
    //     );
    };

    const sections: typeof emptySections = [];
    if (results) {
        sections.push({
            data: results,
            key: 'results',
            title: formatMessage({id: 'search_header.results', defaultMessage: 'Search Results'}),
            renderItem: renderPost,
            keyExtractor: keyPostExtractor,
        });
    }

    return (
        <Text>
            {'jason'}
        </Text>

    //        {/* <AnimatedSectionList */}
    //        {/*  */}
    //       {/*     contentContainerStyle={paddingTop} */}
    //       {/*  */}
    //       {/*     // ref={scrollRef} */}
    //       {/*     //     style={style.sectionList} */}
    //       {/*     removeClippedSubviews={true} */}
    //       {/*     renderSectionHeader={renderSectionHeader} */}
    //       {/*     sections={sections} */}
    //       {/*     keyboardShouldPersistTaps='always' */}
    //       {/*     keyboardDismissMode='interactive' */}
    //       {/*     stickySectionHeadersEnabled={Platform.OS === 'ios'} */}
    //       {/*  */}
    //       {/*     // onLayout={handleLayout} */}
    //       {/*     // onScroll={handleScroll} */}
    //       {/*     scrollEventThrottle={60} */}
    //       {/*  */}
    //       {/*     // SectionSeparatorComponent={renderRecentSeparator} */}
    //       {/*     //                 onViewableItemsChanged={onViewableItemsChanged} */}
    //       {/*     testID='search.results_list' */}
    //       {/* /> */}
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
        separatorContainer: {
            justifyContent: 'center',
            flex: 1,
            height: RECENT_SEPARATOR_HEIGHT,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        sectionList: {
            flex: 1,
        },
        archivedIndicator: {
            alignItems: 'flex-end',
            width: 150,
            alignSelf: 'flex-end',
            marginTop: -17,
            marginRight: 10,
        },
        archivedText: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
        },
        postResult: {
            overflow: 'hidden',
        },
        postsSeparator: {
            height: 15,
        },
    };
});

export default SearchResults;

