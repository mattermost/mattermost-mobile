// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {FlatList, StyleSheet} from 'react-native';

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
        navigator: PropTypes.object,
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
    };

    static defaultProps = {
        onLoadMoreUp: () => true,
        renderFooter: () => null,
        refreshing: false,
        serverURL: '',
        siteURL: '',
    };

    constructor(props) {
        super(props);

        this.hasDoneInitialScroll = false;
        this.contentOffsetY = 0;
        this.makeExtraData = makeExtraData();
        this.flatListRef = React.createRef();

        this.state = {
            postListHeight: 0,
        };
    }

    componentDidMount() {
        EventEmitter.on('scroll-to-bottom', this.scrollToBottom);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.channelId !== nextProps.channelId) {
            this.contentOffsetY = 0;
            this.hasDoneInitialScroll = false;
        }
    }

    componentDidUpdate() {
        if (this.props.deepLinkURL) {
            this.handleDeepLink(this.props.deepLinkURL);
            this.props.actions.setDeepLinkURL('');
        }
    }

    componentWillUnmount() {
        EventEmitter.off('scroll-to-bottom', this.scrollToBottom);
    }

    handleClosePermalink = () => {
        const {actions} = this.props;
        actions.selectFocusedPostId('');
        this.showingPermalink = false;
    };

    handleContentSizeChange = (contentWidth, contentHeight) => {
        this.scrollToInitialIndexIfNeeded(contentWidth, contentHeight);

        if (this.state.postListHeight && contentHeight < this.state.postListHeight && this.props.extraData) {
            // We still have less than 1 screen of posts loaded with more to get, so load more
            this.props.onLoadMoreUp();
        }
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
        requestAnimationFrame(() => {
            this.hasDoneInitialScroll = false;
            this.scrollToInitialIndexIfNeeded(1, 1);
        });
    };

    keyExtractor = (item) => {
        // All keys are strings (either post IDs or special keys)
        return item;
    };

    renderItem = ({item, index}) => {
        if (PostListUtils.isStartOfNewMessages(item)) {
            // postIds includes a date item after the new message indicator so 2
            // needs to be added to the index for the length check to be correct.
            const moreNewMessages = this.props.postIds.length === index + 2;

            return (
                <NewMessagesDivider
                    index={index}
                    theme={this.props.theme}
                    moreMessages={moreNewMessages}
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
        const previousPostId = index < this.props.postIds.length - 1 ? this.props.postIds[index + 1] : null;
        const nextPostId = index > 0 ? this.props.postIds[index - 1] : null;

        const postProps = {
            previousPostId,
            nextPostId,
            highlightPinnedOrFlagged: this.props.highlightPinnedOrFlagged,
            isSearchResult: this.props.isSearchResult,
            location: this.props.location,
            managedConfig: mattermostManaged.getCachedConfig(),
            navigator: this.props.navigator,
            onHashtagPress: this.props.onHashtagPress,
            onPermalinkPress: this.handlePermalinkPress,
            onPress: this.props.onPostPress,
            renderReplies: this.props.renderReplies,
            shouldRenderReplyButton: this.props.shouldRenderReplyButton,
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
                highlight={this.props.highlightPostId === postId}
                isLastPost={this.props.lastPostIndex === index}
                {...postProps}
            />
        );
    };

    scrollToBottom = () => {
        this.flatListRef.current.scrollToOffset({offset: 0, animated: true});
    };

    scrollToInitialIndexIfNeeded = (width, height) => {
        if (
            width > 0 &&
            height > 0 &&
            this.props.initialIndex > 0 &&
            !this.hasDoneInitialScroll
        ) {
            this.flatListRef.current.scrollToIndex({
                animated: false,
                index: this.props.initialIndex,
                viewOffset: 50,
                viewPosition: 0.5,
            });
            this.hasDoneInitialScroll = true;
        }
    };

    showPermalinkView = (postId) => {
        const {actions, navigator} = this.props;

        actions.selectFocusedPostId(postId);

        if (!this.showingPermalink) {
            const options = {
                screen: 'Permalink',
                animationType: 'none',
                backButtonTitle: '',
                overrideBackPress: true,
                navigatorStyle: {
                    navBarHidden: true,
                    screenBackgroundColor: changeOpacity('#000', 0.2),
                    modalPresentationStyle: 'overCurrentContext',
                },
                passProps: {
                    isPermalink: true,
                    onClose: this.handleClosePermalink,
                },
            };

            this.showingPermalink = true;
            navigator.showModal(options);
        }
    };

    render() {
        const {
            channelId,
            highlightPostId,
            postIds,
            refreshing,
        } = this.props;

        const refreshControl = {refreshing};

        if (channelId) {
            refreshControl.onRefresh = this.handleRefresh;
        }

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
                {...refreshControl}
            />
        );
    }
}

const styles = StyleSheet.create({
    postListContent: {
        paddingTop: 5,
    },
});
