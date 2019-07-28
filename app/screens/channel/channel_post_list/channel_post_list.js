// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {
    Keyboard,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import {getLastPostIndex} from 'mattermost-redux/utils/post_list';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import AnnouncementBanner from 'app/components/announcement_banner';
import PostList from 'app/components/post_list';
import RetryBarIndicator from 'app/components/retry_bar_indicator';
import {ViewTypes} from 'app/constants';
import tracker from 'app/utils/time_tracker';
import telemetry from 'app/telemetry';

let ChannelIntro = null;
let LoadMorePosts = null;

export default class ChannelPostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadPostsIfNecessaryWithRetry: PropTypes.func.isRequired,
            loadThreadIfNecessary: PropTypes.func.isRequired,
            increasePostVisibility: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
            recordLoadTime: PropTypes.func.isRequired,
            refreshChannelWithRetry: PropTypes.func.isRequired,
            goToScreen: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        channelRefreshingFailed: PropTypes.bool,
        currentUserId: PropTypes.string,
        lastViewedAt: PropTypes.number,
        loadMorePostsVisible: PropTypes.bool.isRequired,
        postIds: PropTypes.array,
        postVisibility: PropTypes.number,
        refreshing: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
        updateNativeScrollView: PropTypes.func,
    };

    static defaultProps = {
        postIds: [],
        postVisibility: ViewTypes.POST_VISIBILITY_CHUNK_SIZE,
    };

    constructor(props) {
        super(props);

        this.state = {
            visiblePostIds: this.getVisiblePostIds(props),
        };

        this.contentHeight = 0;

        this.isLoadingMoreBottom = false;
        this.isLoadingMoreTop = false;
    }

    componentDidMount() {
        EventEmitter.on('goToThread', this.goToThread);
    }

    componentWillReceiveProps(nextProps) {
        const {postIds: nextPostIds} = nextProps;

        let visiblePostIds = this.state.visiblePostIds;
        if (nextPostIds !== this.props.postIds || nextProps.postVisibility !== this.props.postVisibility) {
            visiblePostIds = this.getVisiblePostIds(nextProps);
        }

        if (this.props.channelId !== nextProps.channelId) {
            this.isLoadingMoreTop = false;
        }

        this.setState({visiblePostIds});
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

    getVisiblePostIds = (props) => {
        return props.postIds ? props.postIds.slice(0, props.postVisibility) : [];
    };

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
            actions.goToScreen(screen, title, passProps);
        });
    };

    loadMorePostsTop = () => {
        const {actions, channelId} = this.props;
        if (!this.isLoadingMoreTop) {
            this.isLoadingMoreTop = true;
            actions.increasePostVisibility(
                channelId,
                this.state.visiblePostIds[this.state.visiblePostIds.length - 1]
            ).then((hasMore) => {
                this.isLoadingMoreTop = !hasMore;
            });
        }
    };

    loadPostsRetry = () => {
        const {actions, channelId} = this.props;
        actions.loadPostsIfNecessaryWithRetry(channelId);
    };

    renderFooter = () => {
        if (!this.props.channelId) {
            return null;
        }

        if (this.props.loadMorePostsVisible) {
            if (!LoadMorePosts) {
                LoadMorePosts = require('app/components/load_more_posts').default;
            }

            return (
                <LoadMorePosts
                    channelId={this.props.channelId}
                    loadMore={this.loadMorePostsTop}
                    theme={this.props.theme}
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

    render() {
        const {
            actions,
            channelId,
            channelRefreshingFailed,
            currentUserId,
            lastViewedAt,
            loadMorePostsVisible,
            refreshing,
            theme,
        } = this.props;

        const {visiblePostIds} = this.state;
        let component;

        if (visiblePostIds.length === 0 && channelRefreshingFailed) {
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
                    postIds={visiblePostIds}
                    lastPostIndex={Platform.OS === 'android' ? getLastPostIndex(visiblePostIds) : -1}
                    extraData={loadMorePostsVisible}
                    onLoadMoreUp={this.loadMorePostsTop}
                    onPostPress={this.goToThread}
                    onRefresh={actions.setChannelRefreshing}
                    renderReplies={true}
                    indicateNewMessages={true}
                    currentUserId={currentUserId}
                    lastViewedAt={lastViewedAt}
                    channelId={channelId}
                    renderFooter={this.renderFooter}
                    refreshing={refreshing}
                    scrollViewNativeID={channelId}
                />
            );
        }

        return (
            <View style={style.container}>
                {component}
                <AnnouncementBanner/>
                <RetryBarIndicator/>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
});
