// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {
    Keyboard,
    Platform,
    View,
} from 'react-native';

import {getLastPostIndex} from 'mattermost-redux/utils/post_list';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import AnnouncementBanner from 'app/components/announcement_banner';
import PostList from 'app/components/post_list';
import RetryBarIndicator from 'app/components/retry_bar_indicator';
import {PostRequestTypes} from 'app/constants';
import tracker from 'app/utils/time_tracker';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import telemetry from 'app/telemetry';
import {goToScreen} from 'app/actions/navigation';

let ChannelIntro = null;
let LoadMorePosts = null;

export default class ChannelPostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadPostsIfNecessaryWithRetry: PropTypes.func.isRequired,
            loadThreadIfNecessary: PropTypes.func.isRequired,
            loadPosts: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
            recordLoadTime: PropTypes.func.isRequired,
            refreshChannelWithRetry: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        channelRefreshingFailed: PropTypes.bool,
        currentUserId: PropTypes.string,
        lastViewedAt: PropTypes.number,
        atOldestPost: PropTypes.bool.isRequired,
        atLatestPost: PropTypes.bool.isRequired,
        postIds: PropTypes.array,
        refreshing: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
        updateNativeScrollView: PropTypes.func,
    };

    static defaultProps = {
        postIds: [],
    };

    constructor(props) {
        super(props);
        this.contentHeight = 0;

        this.isLoadingMoreDown = false;
        this.isLoadingMoreTop = false;
    }

    componentDidMount() {
        EventEmitter.on('goToThread', this.goToThread);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.channelId !== nextProps.channelId) {
            this.isLoadingMoreTop = false;
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.channelId !== this.props.channelId && tracker.channelSwitch) {
            this.props.actions.recordLoadTime('Switch Channel', 'channelSwitch');
        }

        if (!prevProps.postIds?.length && this.props.postIds?.length > 0 && this.props.updateNativeScrollView) {
            // This is needed to re-bind the scrollview natively when getting the first posts
            this.props.updateNativeScrollView();
        }
    }

    componentWillUnmount() {
        EventEmitter.off('goToThread', this.goToThread);
    }

    goToThread = (post) => {
        telemetry.start(['post_list:thread']);
        const {actions, channelId} = this.props;
        const rootId = (post.root_id || post.id);

        Keyboard.dismiss();
        actions.loadThreadIfNecessary(rootId);
        actions.selectPost(rootId);

        const screen = 'Thread';
        const title = '';
        const passProps = {
            channelId,
            rootId,
        };

        requestAnimationFrame(() => {
            goToScreen(screen, title, passProps);
        });
    };

    loadMorePostsTop = async () => {
        const {actions, channelId, postIds} = this.props;
        if (!this.isLoadingMoreTop && !this.props.atOldestPost) {
            this.isLoadingMoreTop = true;
            await actions.loadPosts({
                channelId,
                postId: postIds[postIds.length - 1],
                type: PostRequestTypes.BEFORE_ID,
            });
            this.isLoadingMoreTop = false;
        }
    };

    loadMorePostsDown = async () => {
        const {actions, channelId, postIds} = this.props;
        if (!this.isLoadingMoreDown && !this.props.atLatestPost) {
            this.isLoadingMoreDown = true;
            await actions.loadPosts({
                channelId,
                postId: postIds[0],
                type: PostRequestTypes.AFTER_ID,
            });
            this.isLoadingMoreDown = false;
        }
    }

    loadPostsRetry = () => {
        const {actions, channelId} = this.props;
        actions.loadPostsIfNecessaryWithRetry(channelId);
    };

    renderFooter = () => {
        if (!this.props.channelId) {
            return null;
        }

        if (!this.props.atOldestPost) {
            if (!LoadMorePosts) {
                LoadMorePosts = require('app/components/load_more_posts.js').default;
            }

            return (
                <LoadMorePosts
                    channelId={this.props.channelId}
                    loadMore={this.loadMorePostsTop}
                    theme={this.props.theme}
                    loading={this.isLoadingMoreTop}
                />
            );
        }

        if (!ChannelIntro) {
            ChannelIntro = require('app/components/channel_intro').default;
        }

        return (
            <ChannelIntro
                channelId={this.props.channelId}
            />
        );
    };

    renderHeader = () => {
        if (!this.props.channelId || this.props.postIds.length === 0) {
            return null;
        }

        if (!this.props.atLatestPost) {
            if (!LoadMorePosts) {
                LoadMorePosts = require('app/components/load_more_posts.js').default;
            }

            return (
                <LoadMorePosts
                    channelId={this.props.channelId}
                    loadMore={this.loadMorePostsDown}
                    theme={this.props.theme}
                    loading={this.isLoadingMoreDown}
                />
            );
        }

        return null;
    }

    render() {
        const {
            actions,
            channelId,
            channelRefreshingFailed,
            currentUserId,
            lastViewedAt,
            atOldestPost,
            refreshing,
            theme,
            postIds,
        } = this.props;

        let component;

        if ((!postIds || postIds.length === 0) && channelRefreshingFailed) {
            const FailedNetworkAction = require('app/components/failed_network_action').default;

            component = (
                <FailedNetworkAction
                    onRetry={this.loadPostsRetry}
                    theme={theme}
                />
            );
        } else {
            component = (
                <PostList
                    postIds={this.props.postIds}
                    lastPostIndex={Platform.OS === 'android' ? getLastPostIndex(postIds) : -1}
                    extraData={atOldestPost}
                    onLoadMoreUp={this.loadMorePostsTop}
                    onLoadMoreDown={this.loadMorePostsDown}
                    onPostPress={this.goToThread}
                    onRefresh={actions.setChannelRefreshing}
                    renderReplies={true}
                    indicateNewMessages={true}
                    currentUserId={currentUserId}
                    lastViewedAt={lastViewedAt}
                    channelId={channelId}
                    renderFooter={this.renderFooter}
                    renderHeader={this.renderHeader}
                    refreshing={refreshing}
                    scrollViewNativeID={channelId}
                />
            );
        }

        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <View style={style.separator}/>
                {component}
                <AnnouncementBanner/>
                <RetryBarIndicator/>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
    },
    separator: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        height: 1,
    },
}));
