// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, FlatList, RefreshControl, StyleSheet} from 'react-native';
import {intlShape} from 'react-intl';

import EventEmitter from 'mattermost-redux/utils/event_emitter';
import * as PostListUtils from 'mattermost-redux/utils/post_list';

import CombinedUserActivityPost from 'app/components/combined_user_activity_post';
import Post from 'app/components/post';
import {DeepLinkTypes, ListTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import {makeExtraData} from 'app/utils/list_view';
import {changeOpacity} from 'app/utils/theme';
import {matchDeepLink} from 'app/utils/url';
import telemetry from 'app/telemetry';
import {showModalOverCurrentContext} from 'app/actions/navigation';

import DateHeader from './date_header';
import NewMessagesDivider from './new_messages_divider';

const INITIAL_BATCH_TO_RENDER = 15;
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
        actions: PropTypes.shape({
            handleSelectChannelByName: PropTypes.func.isRequired,
            loadChannelsByTeamName: PropTypes.func.isRequired,
            refreshChannelWithRetry: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
            setDeepLinkURL: PropTypes.func.isRequired,
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
        onLoadMoreUp: PropTypes.func,
        onHashtagPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
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
    };

    static defaultProps = {
        onLoadMoreUp: () => true,
        renderFooter: () => null,
        refreshing: false,
        serverURL: '',
        siteURL: '',
        postIds: [],
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.hasDoneInitialScroll = false;
        this.contentOffsetY = 0;
        this.shouldScrollToBottom = false;
        this.makeExtraData = makeExtraData();
        this.flatListRef = React.createRef();

        this.state = {
            postListHeight: 0,
        };
    }

    componentDidMount() {
        const {actions, deepLinkURL} = this.props;

        EventEmitter.on('scroll-to-bottom', this.handleSetScrollToBottom);

        // Invoked when hitting a deep link and app is not already running.
        if (deepLinkURL) {
            this.handleDeepLink(deepLinkURL);
            actions.setDeepLinkURL('');
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

        if (!this.hasDoneInitialScroll && this.props.initialIndex > 0 && this.state.contentHeight) {
            this.scrollToInitialIndexIfNeeded(this.props.initialIndex);
        }

        if (
            this.props.channelId === prevProps.channelId &&
            this.props.postIds.length &&
            this.state.contentHeight &&
            this.state.contentHeight < this.state.postListHeight &&
            this.props.extraData
        ) {
            this.loadToFillContent();
        }
    }

    componentWillUnmount() {
        EventEmitter.off('scroll-to-bottom', this.handleSetScrollToBottom);

        if (this.animationFrameIndexFailed) {
            cancelAnimationFrame(this.animationFrameIndexFailed);
        }

        if (this.animationFrameInitialIndex) {
            cancelAnimationFrame(this.animationFrameInitialIndex);
        }
    }

    getItemCount = () => {
        return this.props.postIds.length;
    };

    handleClosePermalink = () => {
        const {actions} = this.props;
        actions.selectFocusedPostId('');
        this.showingPermalink = false;
    };

    handleContentSizeChange = (contentWidth, contentHeight) => {
        this.setState({contentHeight}, () => {
            if (this.state.postListHeight && contentHeight < this.state.postListHeight && this.props.extraData) {
                // We still have less than 1 screen of posts loaded with more to get, so load more
                this.props.onLoadMoreUp();
            }
        });
    };

    handleDeepLink = (url) => {
        const {serverURL, siteURL} = this.props;

        const match = matchDeepLink(url, serverURL, siteURL);

        if (match) {
            if (match.type === DeepLinkTypes.CHANNEL) {
                this.props.actions.handleSelectChannelByName(match.channelName, match.teamName);
            } else if (match.type === DeepLinkTypes.PERMALINK) {
                this.handlePermalinkPress(match.postId, match.teamName);
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
        this.setState({postListHeight: height});
    };

    handlePermalinkPress = (postId, teamName) => {
        telemetry.start(['post_list:permalink']);
        const {actions, onPermalinkPress} = this.props;

        if (onPermalinkPress) {
            onPermalinkPress(postId, true);
        } else {
            actions.loadChannelsByTeamName(teamName);
            this.showPermalinkView(postId);
        }
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
            const direction = (this.contentOffsetY < pageOffsetY) ?
                ListTypes.VISIBILITY_SCROLL_UP :
                ListTypes.VISIBILITY_SCROLL_DOWN;

            this.contentOffsetY = pageOffsetY;
            if (
                direction === ListTypes.VISIBILITY_SCROLL_UP &&
                (contentHeight - pageOffsetY) < (this.state.postListHeight * SCROLL_UP_MULTIPLIER)
            ) {
                this.props.onLoadMoreUp();
            }
        }
    };

    handleScrollToIndexFailed = () => {
        this.animationFrameIndexFailed = requestAnimationFrame(() => {
            if (this.props.initialIndex > 0 && this.state.contentHeight > 0) {
                this.hasDoneInitialScroll = false;
                this.scrollToInitialIndexIfNeeded(this.props.initialIndex);
            }
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
        setTimeout(() => {
            this.handleContentSizeChange(0, this.state.contentHeight);
        });
    };

    renderItem = ({item, index}) => {
        const {
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
            <Post
                postId={postId}
                highlight={highlightPostId === postId}
                isLastPost={lastPostIndex === index}
                {...postProps}
            />
        );
    };

    scrollToBottom = () => {
        setTimeout(() => {
            if (this.flatListRef.current) {
                this.flatListRef.current.scrollToOffset({offset: 0, animated: true});
            }
        }, 250);
    };

    flatListScrollToIndex = (index) => {
        this.flatListRef.current.scrollToIndex({
            animated: false,
            index,
            viewOffset: 0,
            viewPosition: 1, // 0 is at bottom
        });
    }

    resetPostList = () => {
        this.contentOffsetY = 0;
        this.hasDoneInitialScroll = false;
        this.setState({contentHeight: 0});
    }

    scrollToIndex = (index) => {
        this.animationFrameInitialIndex = requestAnimationFrame(() => {
            if (this.flatListRef.current && index > 0 && index <= this.getItemCount()) {
                this.flatListScrollToIndex(index);
            }
        });
    };

    scrollToInitialIndexIfNeeded = (index, count = 0) => {
        if (!this.hasDoneInitialScroll) {
            if (index > 0 && index <= this.getItemCount()) {
                this.hasDoneInitialScroll = true;
                this.scrollToIndex(index);
            } else if (count < 3) {
                setTimeout(() => {
                    this.scrollToInitialIndexIfNeeded(index, count + 1);
                }, 300);
            }
        }
    };

    showPermalinkView = (postId) => {
        const {actions} = this.props;

        actions.selectFocusedPostId(postId);

        if (!this.showingPermalink) {
            const screen = 'Permalink';
            const passProps = {
                isPermalink: true,
                onClose: this.handleClosePermalink,
            };
            const options = {
                layout: {
                    backgroundColor: changeOpacity('#000', 0.2),
                },
            };

            this.showingPermalink = true;
            showModalOverCurrentContext(screen, passProps, options);
        }
    };

    render() {
        const {
            channelId,
            highlightPostId,
            postIds,
            refreshing,
            scrollViewNativeID,
            theme,
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
            <FlatList
                key={`recyclerFor-${channelId}-${hasPostsKey}`}
                ref={this.flatListRef}
                contentContainerStyle={styles.postListContent}
                data={postIds}
                extraData={this.makeExtraData(channelId, highlightPostId, this.props.extraData)}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                inverted={true}
                keyboardDismissMode={'interactive'}
                keyboardShouldPersistTaps={'handled'}
                keyExtractor={this.keyExtractor}
                ListFooterComponent={this.props.renderFooter}
                maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                onContentSizeChange={this.handleContentSizeChange}
                onLayout={this.handleLayout}
                onScroll={this.handleScroll}
                onScrollToIndexFailed={this.handleScrollToIndexFailed}
                removeClippedSubviews={true}
                renderItem={this.renderItem}
                scrollEventThrottle={60}
                refreshControl={refreshControl}
                nativeID={scrollViewNativeID}
            />
        );
    }
}

const styles = StyleSheet.create({
    postListContent: {
        paddingTop: 5,
    },
});
