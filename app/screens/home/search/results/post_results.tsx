// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {DeviceEventEmitter, FlatList, type ListRenderItemInfo, type StyleProp, type ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import NoResultsWithTerm from '@components/no_results_with_term';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import {Events, Screens} from '@constants';
import {ExtraKeyboardProvider} from '@context/extra_keyboard';
import {useTheme} from '@context/theme';
import {convertSearchTermToRegex, parseSearchTerms} from '@utils/markdown';
import {getDateForDateLine, selectOrderedPosts} from '@utils/post_list';
import {TabTypes} from '@utils/search';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {PostListItem, PostListOtherItem, ViewableItemsChanged} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';
import type {SearchPattern} from '@typings/global/markdown';

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    resultsNumber: {
        ...typography('Heading', 300),
        padding: 20,
        color: theme.centerChannelColor,
    },
}));

type Props = {
    appsEnabled: boolean;
    customEmojiNames: string[];
    currentTimezone: string;
    posts: PostModel[];
    matches?: SearchMatches;
    paddingTop: StyleProp<ViewStyle>;
    searchValue: string;
}

const PostResults = ({
    appsEnabled,
    currentTimezone,
    customEmojiNames,
    posts,
    matches,
    paddingTop,
    searchValue,
}: Props) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, currentTimezone, false).reverse(), [posts]);
    const containerStyle = useMemo(() => ([paddingTop, {flexGrow: 1}]), [paddingTop]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<PostListItem | PostListOtherItem>) => {
        switch (item.type) {
            case 'date':
                return (
                    <DateSeparator
                        key={item.value}
                        date={getDateForDateLine(item.value)}
                        timezone={currentTimezone}
                    />
                );
            case 'post': {
                const key = item.value.currentPost.id;
                const hasPhrases = (/"([^"]*)"/).test(searchValue || '');
                let searchPatterns: SearchPattern[] | undefined;
                if (matches && !hasPhrases) {
                    searchPatterns = matches?.[key]?.map(convertSearchTermToRegex);
                } else {
                    searchPatterns = parseSearchTerms(searchValue)?.map(convertSearchTermToRegex).sort((a, b) => {
                        return b.term.length - a.term.length;
                    });
                }

                return (
                    <PostWithChannelInfo
                        appsEnabled={appsEnabled}
                        customEmojiNames={customEmojiNames}
                        key={key}
                        location={Screens.SEARCH}
                        post={item.value.currentPost}
                        searchPatterns={searchPatterns}
                        testID='search_results.post_list'
                    />
                );
            }
            default:
                return null;
        }
    }, [currentTimezone, searchValue, matches, appsEnabled, customEmojiNames]);

    const noResults = useMemo(() => (
        <NoResultsWithTerm
            term={searchValue}
            type={TabTypes.MESSAGES}
        />
    ), [searchValue]);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable && item.type === 'post') {
                acc[`${Screens.SEARCH}-${item.value.currentPost.id}`] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);
    }, []);

    return (
        <ExtraKeyboardProvider>
            <FlatList
                ListHeaderComponent={
                    <FormattedText
                        style={styles.resultsNumber}
                        id='mobile.search.results'
                        defaultMessage='{count} search {count, plural, one {result} other {results}}'
                        values={{count: posts.length}}
                    />
                }
                ListEmptyComponent={noResults}
                contentContainerStyle={containerStyle}
                data={orderedPosts}
                indicatorStyle='black'
                initialNumToRender={5}

                //@ts-expect-error key not defined in types
                listKey={'posts'}
                maxToRenderPerBatch={5}
                nestedScrollEnabled={true}
                refreshing={false}
                removeClippedSubviews={true}
                renderItem={renderItem}
                scrollEventThrottle={16}
                scrollToOverflowEnabled={true}
                showsVerticalScrollIndicator={true}
                onViewableItemsChanged={onViewableItemsChanged}
                testID='search_results.post_list.flat_list'
            />
        </ExtraKeyboardProvider>
    );
};

export default PostResults;
