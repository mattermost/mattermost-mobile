// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useTheme} from '@context/theme';
import {Posts} from '@mm-redux/constants';

import {emptyFunction} from '@utils/general';
import {makeExtraData} from '@utils/list_view';
import React, {ReactElement, useCallback} from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {FlatList, Platform, StyleSheet} from 'react-native';
import Post from './post';

import {INITIAL_BATCH_TO_RENDER, SCROLL_POSITION_CONFIG, VIEWABILITY_CONFIG} from './post_list_config';

//todo: substitute ActionResult with a proper type from network library
type ActionResult = {
    data?: any;
    error?: any;
}

type PostListProps = {
    channelId?: string;
    closePermalink: () => Promise<ActionResult>;
    currentTeamName: string;
    deepLinkURL?: string;
    extraData: never;
    getPostThread: (rootId: string) => Promise<ActionResult>;
    handleSelectChannelByName: (
        channelName: string,
        teamName: string,
        errorHandler: (intl: IntlShape) => void,
        intl: IntlShape
    ) => Promise<ActionResult>;
    highlightPinnedOrFlagged?: boolean;
    highlightPostId?: string;
    initialIndex: number;
    intl: IntlShape;
    loadMorePostsVisible?: boolean;
    location: string;
    onLoadMoreUp: () => void;
    postIds: string[];
    refreshChannelWithRetry: (channelId: string) => Promise<ActionResult>;
    renderFooter: () => ReactElement | null;
    rootId?: string;
    scrollViewNativeID?: string;
    serverURL: string;
    shouldRenderReplyButton?: boolean;
    showMoreMessagesButton?: boolean;
    siteURL: string;
    setDeepLinkURL: (url?: string) => void;
    showPermalink: (
        intl: IntlShape,
        teamName: string,
        postId: string,
        openAsPermalink?: boolean
    ) => Promise<{}>;
    testID?: string;
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    postListContent: {
        paddingTop: 5,
    },
    scale: {
        ...Platform.select({
            android: {
                scaleY: -1,
            },
        }),
    },
});

const buildExtraData = makeExtraData();

const PostList = ({
    channelId,
    extraData,
    highlightPostId,
    highlightPinnedOrFlagged,
    loadMorePostsVisible,
    location,
    onLoadMoreUp = emptyFunction,
    postIds = [],
    renderFooter = () => null,
    scrollViewNativeID,
    shouldRenderReplyButton,
    testID,
}: PostListProps) => {
    const hasPostsKey = postIds.length ? 'true' : 'false';
    const theme = useTheme();
    const keyExtractor = useCallback((item) => {
        // All keys are strings (either post IDs or special keys)
        return item;
    }, []);

    const renderItem = useCallback(
        ({item, index}) => {
            // let previousPostId: string | undefined;
            // let nextPostId: string | undefined;
            // if (index < postIds.length - 1) {
            //     previousPostId = postIds.
            //         slice(index + 1).
            //         find((v) => !isStartOfNewMessages(v) && !isDateLine(v));
            // }
            //
            // if (index > 0) {
            //     const next = postIds.slice(0, index);
            //     for (let i = next.length - 1; i >= 0; i--) {
            //         const v = next[i];
            //         if (!isStartOfNewMessages(v) && !isDateLine(v)) {
            //             nextPostId = v;
            //             break;
            //         }
            //     }
            // }

            const postProps = {
                highlightPinnedOrFlagged,
                location,

                // nextPostId,
                // previousPostId,
                shouldRenderReplyButton,
                theme,
            };

            return (
                <Post
                    highlight={highlightPostId === item}
                    postId={item}
                    style={styles.scale}
                    testID={`${testID}.post`}
                    {...postProps}
                />
            );
        },
        [postIds],
    );

    const list = (
        <FlatList
            contentContainerStyle={styles.postListContent}
            data={postIds}
            extraData={buildExtraData(
                channelId,
                highlightPostId,
                extraData,
                loadMorePostsVisible,
            )}
            initialNumToRender={INITIAL_BATCH_TO_RENDER}
            key={`recyclerFor-${channelId}-${hasPostsKey}`}
            keyboardDismissMode={'interactive'}
            keyboardShouldPersistTaps={'handled'}
            keyExtractor={keyExtractor}
            ListFooterComponent={renderFooter}
            listKey={`recyclerFor-${channelId}`}
            maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
            maxToRenderPerBatch={Platform.select({android: 5})}
            nativeID={scrollViewNativeID}
            onEndReached={onLoadMoreUp}
            onEndReachedThreshold={2}
            removeClippedSubviews={true}
            renderItem={renderItem}
            scrollEventThrottle={60}
            style={styles.flex}
            windowSize={Posts.POST_CHUNK_SIZE / 2}
            viewabilityConfig={VIEWABILITY_CONFIG}
            testID={testID}
        />
    );

    return (
        <>
            {list}
        </>
    );
};

export default injectIntl(PostList);
