// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, DeviceEventEmitter, FlatList, Platform, RefreshControl, StyleSheet} from 'react-native';
import {intlShape} from 'react-intl';

import {Posts} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';
import * as PostListUtils from '@mm-redux/utils/post_list';
import {errorBadChannel} from '@utils/draft';

import CombinedUserActivityPost from 'app/components/combined_user_activity_post';
import Post from 'app/components/post';
import {DeepLinkTypes, ListTypes, NavigationTypes} from '@constants';
import mattermostManaged from 'app/mattermost_managed';
import {makeExtraData} from 'app/utils/list_view';
import {matchDeepLink, PERMALINK_GENERIC_TEAM_NAME_REDIRECT} from 'app/utils/url';
import telemetry from 'app/telemetry';

import DateHeader from './date_header';
import NewMessagesDivider from './new_messages_divider';
import MoreMessagesButton from './more_messages_button';

const INITIAL_BATCH_TO_RENDER = 10;
const SCROLL_UP_MULTIPLIER = 3.5;
const SCROLL_POSITION_CONFIG = {

    // To avoid scrolling the list when new messages arrives
    // if the user is not at the bottom
    minIndexForVisible: 0,

    // If the user is at the bottom or 60px from the bottom
    // auto scroll show the new message
    autoscrollToTopThreshold: 60,
};

export default class PostList extends PureComponent {
    static propTypes = {
        testID: PropTypes.string,
        actions: PropTypes.shape({
            closePermalink: PropTypes.func.isRequired,
            handleSelectChannelByName: PropTypes.func.isRequired,
            refreshChannelWithRetry: PropTypes.func.isRequired,
            setDeepLinkURL: PropTypes.func.isRequired,
            showPermalink: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string,
        deepLinkURL: PropTypes.string,
        extraData: PropTypes.any,
        highlightPinnedOrFlagged: PropTypes.bool,
        highlightPostId: PropTypes.string,
        initialIndex: PropTypes.number,
        isSearchResult: PropTypes.bool,
        lastPostIndex: PropTypes.number.isRequired,
        lastViewedAt: PropTypes.number, // Used by container // eslint-disable-line no-unused-prop-types
        loadMorePostsVisible: PropTypes.bool,
        onLoadMoreUp: PropTypes.func,
        onHashtagPress: PropTypes.func,
        onPostPress: PropTypes.func,
        onRefresh: PropTypes.func,
        postIds: PropTypes.array.isRequired,
        refreshing: PropTypes.bool,
        renderFooter: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
        renderReplies: PropTypes.bool,
        serverURL: PropTypes.string.isRequired,
        shouldRenderReplyButton: PropTypes.bool,
        siteURL: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        location: PropTypes.string,
        scrollViewNativeID: PropTypes.string,
        showMoreMessagesButton: PropTypes.bool,
        currentTeamName: PropTypes.string,
    };

    static defaultProps = {
        onLoadMoreUp: () => true,
        renderFooter: () => null,
        refreshing: false,
        serverURL: '',
        siteURL: '',
        postIds: [],
        showMoreMessagesButton: false,
        currentTeamName: '',
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.contentOffsetY = 0;
        this.contentHeight = 0;
        this.hasDoneInitialScroll = false;
        this.shouldScrollToBottom = false;
        this.makeExtraData = makeExtraData();
        this.flatListRef = React.createRef();
    }

    componentDidMount() {
        const {actions, deepLinkURL, highlightPostId, initialIndex} = this.props;

        EventEmitter.on('scroll-to-bottom', this.handleSetScrollToBottom);
        EventEmitter.on(NavigationTypes.NAVIGATION_DISMISS_AND_POP_TO_ROOT, this.handleClosePermalink);

        // Invoked when hitting a deep link and app is not already running.
        if (deepLinkURL) {
            this.handleDeepLink(deepLinkURL);
            actions.setDeepLinkURL('');
        }

        // Scroll to highlighted post for permalinks
        if (!this.hasDoneInitialScroll && initialIndex > 0 && highlightPostId) {
            this.scrollToInitialIndexIfNeeded(initialIndex);
        }
    }

    componentDidUpdate(prevProps) {
        const {actions, channelId, deepLinkURL, postIds} = this.props;

        if (this.props.channelId !== prevProps.channelId) {
            this.resetPostList();
        }

        // Invoked when hitting a deep link and app is already running.
        if (deepLinkURL && deepLinkURL !== prevProps.deepLinkURL) {
            this.handleDeepLink(deepLinkURL);
            actions.setDeepLinkURL('');
        }

        if (this.shouldScrollToBottom && prevProps.channelId === channelId && prevProps.postIds.length === postIds.length) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }

        if (
            this.props.channelId === prevProps.channelId &&
            this.props.postIds.length &&
            this.contentHeight &&
            this.contentHeight < this.postListHeight &&
            this.props.extraData
        ) {
            this.loadToFillContent();
        }
    }

    componentWillUnmount() {
        EventEmitter.off('scroll-to-bottom', this.handleSetScrollToBottom);
        EventEmitter.off(NavigationTypes.NAVIGATION_DISMISS_AND_POP_TO_ROOT, this.handleClosePermalink);

        this.resetPostList();
    }

    flatListScrollToIndex = (index) => {
        this.animationFrameInitialIndex = requestAnimationFrame(() => {
            this.flatListRef.current.scrollToIndex({
                animated: true,
                index,
                viewOffset: 0,
                viewPosition: 1, // 0 is at bottom
            });
        });
    }

    getItemCount = () => {
        return this.props.postIds.length;
    };

    handleClosePermalink = () => {
        this.props.actions.closePermalink();
    }

    handleContentSizeChange = (contentWidth, contentHeight, forceLoad) => {
        this.contentHeight = contentHeight;
        const loadMore = forceLoad || !this.props.extraData;
        if (this.postListHeight && contentHeight < this.postListHeight && loadMore) {
            // We still have less than 1 screen of posts loaded with more to get, so load more
            this.props.onLoadMoreUp();
        }
    };

    handleDeepLink = (url) => {
        const {serverURL, siteURL, currentTeamName} = this.props;

        const match = matchDeepLink(url, serverURL, siteURL);

        if (match) {
            if (match.type === DeepLinkTypes.CHANNEL) {
                const {intl} = this.context;
                this.props.actions.handleSelectChannelByName(match.channelName, match.teamName, errorBadChannel(intl), intl);
            } else if (match.type === DeepLinkTypes.PERMALINK) {
                if (match.teamName === PERMALINK_GENERIC_TEAM_NAME_REDIRECT) {
                    this.handlePermalinkPress(match.postId, currentTeamName);
                } else {
                    this.handlePermalinkPress(match.postId, match.teamName);
                }
            }
        } else {
            const {formatMessage} = this.context.intl;
            Alert.alert(
                formatMessage({
                    id: 'mobile.server_link.error.title',
                    defaultMessage: 'Link Error',
                }),
                formatMessage({
                    id: 'mobile.server_link.error.text',
                    defaultMessage: 'The link could not be found on this server.',
                }),
            );
        }
    };

    handleLayout = (event) => {
        const {height} = event.nativeEvent.layout;
        if (this.postListHeight !== height) {
            this.postListHeight = height;
        }
    };

    handlePermalinkPress = (postId, teamName) => {
        telemetry.start(['post_list:permalink']);
        const {showPermalink} = this.props.actions;

        showPermalink(this.context.intl, teamName, postId);
    };

    handleRefresh = () => {
        const {
            actions,
            channelId,
            onRefresh,
        } = this.props;

        if (channelId) {
            actions.refreshChannelWithRetry(channelId);
        }

        if (onRefresh) {
            onRefresh();
        }
    };

    handleScroll = (event) => {
        const pageOffsetY = event.nativeEvent.contentOffset.y;
        if (pageOffsetY > 0) {
            const contentHeight = event.nativeEvent.contentSize.height;
            const direction = (this.contentOffsetY < pageOffsetY) ? ListTypes.VISIBILITY_SCROLL_UP : ListTypes.VISIBILITY_SCROLL_DOWN;

            this.contentOffsetY = pageOffsetY;
            if (
                direction === ListTypes.VISIBILITY_SCROLL_UP &&
                (contentHeight - pageOffsetY) < (this.postListHeight * SCROLL_UP_MULTIPLIER)
            ) {
                this.props.onLoadMoreUp();
            }
        }
    };

    handleScrollToIndexFailed = (info) => {
        this.animationFrameIndexFailed = requestAnimationFrame(() => {
            if (this.onScrollEndIndexListener) {
                this.onScrollEndIndexListener(info.highestMeasuredFrameIndex);
            }
            this.flatListScrollToIndex(info.highestMeasuredFrameIndex);
        });
    };

    handleSetScrollToBottom = () => {
        this.shouldScrollToBottom = true;
    }

    keyExtractor = (item) => {
        // All keys are strings (either post IDs or special keys)
        return item;
    };

    loadToFillContent = () => {
        this.fillContentTimer = setTimeout(() => {
            this.handleContentSizeChange(0, this.contentHeight, true);
        });
    };

    renderItem = ({item, index}) => {
        const {
            testID,
            highlightPinnedOrFlagged,
            highlightPostId,
            isSearchResult,
            lastPostIndex,
            location,
            onHashtagPress,
            onPostPress,
            postIds,
            renderReplies,
            shouldRenderReplyButton,
            theme,
        } = this.props;

        if (PostListUtils.isStartOfNewMessages(item)) {
            // postIds includes a date item after the new message indicator so 2
            // needs to be added to the index for the length check to be correct.
            const moreNewMessages = postIds.length === index + 2;

            // The date line and new message line each count for a line. So the
            // goal of this is to check for the 3rd previous, which for the start
            // of a thread would be null as it doesn't exist.
            const checkForPostId = index < postIds.length - 3;

            return (
                <NewMessagesDivider
                    index={index}
                    theme={theme}
                    moreMessages={moreNewMessages && checkForPostId}
                />
            );
        } else if (PostListUtils.isDateLine(item)) {
            return (
                <DateHeader
                    date={PostListUtils.getDateForDateLine(item)}
                    index={index}
                />
            );
        }

        // Remember that the list is rendered with item 0 at the bottom so the "previous" post
        // comes after this one in the list
        const previousPostId = index < postIds.length - 1 ? postIds[index + 1] : null;
        const beforePrevPostId = index < postIds.length - 2 ? postIds[index + 2] : null;
        const nextPostId = index > 0 ? postIds[index - 1] : null;

        const postProps = {
            previousPostId,
            nextPostId,
            highlightPinnedOrFlagged,
            isSearchResult,
            location,
            managedConfig: mattermostManaged.getCachedConfig(),
            onHashtagPress,
            onPermalinkPress: this.handlePermalinkPress,
            onPress: onPostPress,
            renderReplies,
            shouldRenderReplyButton,
            beforePrevPostId,
        };

        if (PostListUtils.isCombinedUserActivityPost(item)) {
            return (
                <CombinedUserActivityPost
                    combinedId={item}
                    {...postProps}
                />
            );
        }

        const postId = item;
        return (
            <MemoizedPost
                testID={testID}
                postId={postId}
                highlight={highlightPostId === postId}
                isLastPost={lastPostIndex === index}
                {...postProps}
            />
        );
    };

    resetPostList = () => {
        this.contentOffsetY = 0;
        this.hasDoneInitialScroll = false;

        if (this.scrollAfterInteraction) {
            this.scrollAfterInteraction.cancel();
        }

        if (this.animationFrameIndexFailed) {
            cancelAnimationFrame(this.animationFrameIndexFailed);
        }

        if (this.animationFrameInitialIndex) {
            cancelAnimationFrame(this.animationFrameInitialIndex);
        }

        if (this.fillContentTimer) {
            clearTimeout(this.fillContentTimer);
        }

        if (this.scrollToBottomTimer) {
            clearTimeout(this.scrollToBottomTimer);
        }

        if (this.scrollToInitialTimer) {
            clearTimeout(this.scrollToInitialTimer);
        }

        if (this.contentHeight !== 0) {
            this.contentHeight = 0;
        }
    }

    scrollToBottom = () => {
        this.scrollToBottomTimer = setTimeout(() => {
            if (this.flatListRef.current) {
                this.flatListRef.current.scrollToOffset({offset: 0, animated: true});
            }
        }, 250);
    };

    scrollToIndex = (index) => {
        this.animationFrameInitialIndex = requestAnimationFrame(() => {
            if (this.flatListRef.current && index > 0 && index <= this.getItemCount()) {
                this.flatListScrollToIndex(index);
            }
        });
    };

    scrollToInitialIndexIfNeeded = (index) => {
        if (!this.hasDoneInitialScroll) {
            if (index > 0 && index <= this.getItemCount()) {
                this.hasDoneInitialScroll = true;
                this.scrollToIndex(index);
                if (index !== this.props.initialIndex) {
                    this.hasDoneInitialScroll = false;
                    this.scrollToInitialTimer = setTimeout(() => {
                        this.scrollToInitialIndexIfNeeded(this.props.initialIndex);
                    }, 10);
                }
            }
        }
    };

    registerViewableItemsListener = (listener) => {
        this.onViewableItemsChangedListener = listener;
        const removeListener = () => {
            this.onViewableItemsChangedListener = null;
        };

        return removeListener;
    }

    registerScrollEndIndexListener = (listener) => {
        this.onScrollEndIndexListener = listener;
        const removeListener = () => {
            this.onScrollEndIndexListener = null;
        };

        return removeListener;
    }

    onViewableItemsChanged = ({viewableItems}) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc, {item, isViewable}) => {
            if (isViewable) {
                acc[item] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit('scrolled', viewableItemsMap);

        if (this.onViewableItemsChangedListener && !this.props.deepLinkURL) {
            this.onViewableItemsChangedListener(viewableItems);
        }
    }

    render() {
        const {
            channelId,
            extraData,
            highlightPostId,
            loadMorePostsVisible,
            postIds,
            refreshing,
            scrollViewNativeID,
            theme,
            initialIndex,
            deepLinkURL,
            showMoreMessagesButton,
        } = this.props;

        const refreshControl = (
            <RefreshControl
                refreshing={refreshing}
                onRefresh={channelId ? this.handleRefresh : null}
                colors={[theme.centerChannelColor]}
                tintColor={theme.centerChannelColor}
            />);

        const hasPostsKey = postIds.length ? 'true' : 'false';

        return (
            <>
                <FlatList
                    contentContainerStyle={styles.postListContent}
                    data={postIds}
                    extraData={this.makeExtraData(channelId, highlightPostId, extraData, loadMorePostsVisible)}
                    initialNumToRender={INITIAL_BATCH_TO_RENDER}
                    inverted={true}
                    key={`recyclerFor-${channelId}-${hasPostsKey}`}
                    keyboardDismissMode={'interactive'}
                    keyboardShouldPersistTaps={'handled'}
                    keyExtractor={this.keyExtractor}
                    ListFooterComponent={this.props.renderFooter}
                    listKey={`recyclerFor-${channelId}`}
                    maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                    maxToRenderPerBatch={Platform.select({android: 5})}
                    nativeID={scrollViewNativeID}
                    onContentSizeChange={this.handleContentSizeChange}
                    onLayout={this.handleLayout}
                    onScroll={this.handleScroll}
                    onScrollToIndexFailed={this.handleScrollToIndexFailed}
                    ref={this.flatListRef}
                    refreshControl={refreshControl}
                    removeClippedSubviews={false}
                    renderItem={this.renderItem}
                    scrollEventThrottle={60}
                    style={styles.flex}
                    windowSize={Posts.POST_CHUNK_SIZE / 2}
                    viewabilityConfig={{
                        itemVisiblePercentThreshold: 1,
                        minimumViewTime: 100,
                    }}
                    onViewableItemsChanged={this.onViewableItemsChanged}
                />
                {showMoreMessagesButton &&
                    <MoreMessagesButton
                        theme={theme}
                        postIds={postIds}
                        channelId={channelId}
                        deepLinkURL={deepLinkURL}
                        newMessageLineIndex={initialIndex}
                        scrollToIndex={this.scrollToIndex}
                        registerViewableItemsListener={this.registerViewableItemsListener}
                        registerScrollEndIndexListener={this.registerScrollEndIndexListener}
                    />
                }
            </>
        );
    }
}

function PostComponent({testID, postId, highlightPostId, lastPostIndex, index, ...postProps}) {
    const postTestID = `${testID}.post`;

    return (
        <Post
            testID={postTestID}
            postId={postId}
            highlight={highlightPostId === postId}
            isLastPost={lastPostIndex === index}
            {...postProps}
        />
    );
}

PostComponent.propTypes = {
    testID: PropTypes.string,
    postId: PropTypes.string.isRequired,
    highlightPostId: PropTypes.string,
    lastPostIndex: PropTypes.number,
    index: PropTypes.number,
};

const MemoizedPost = React.memo(PostComponent);

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    postListContent: {
        paddingTop: 5,
    },
});
