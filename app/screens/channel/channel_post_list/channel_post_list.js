// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {
    Keyboard,
    Platform,
    View,
} from 'react-native';

import {getLastPostIndex} from '@redux/utils/post_list';
import EventEmitter from '@redux/utils/event_emitter';

import AnnouncementBanner from 'app/components/announcement_banner';
import PostList from 'app/components/post_list';
import RetryBarIndicator from 'app/components/retry_bar_indicator';
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
            increasePostVisibility: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
            recordLoadTime: PropTypes.func.isRequired,
            refreshChannelWithRetry: PropTypes.func.isRequired,
            setChannelRefreshing: PropTypes.func,
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        channelRefreshingFailed: PropTypes.bool,
        currentUserId: PropTypes.string,
        lastViewedAt: PropTypes.number,
        loadMorePostsVisible: PropTypes.bool.isRequired,
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

        this.isLoadingMoreBottom = false;
        this.isLoadingMoreTop = false;
    }

    componentDidMount() {
        EventEmitter.on('goToThread', this.goToThread);
    }

    componentDidUpdate(prevProps) {
        if (this.props.channelId !== prevProps.channelId) {
            this.isLoadingMoreTop = false;
            if (tracker.channelSwitch) {
                this.props.actions.recordLoadTime('Switch Channel', 'channelSwitch');
            }
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

    loadMorePostsTop = () => {
        const {actions, channelId, postIds} = this.props;
        if (!this.isLoadingMoreTop) {
            this.isLoadingMoreTop = true;
            actions.increasePostVisibility(
                channelId,
                postIds[postIds.length - 1],
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
            postIds,
            refreshing,
            theme,
        } = this.props;

        let component;

        if (postIds.length === 0 && channelRefreshingFailed) {
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
                    postIds={postIds}
                    lastPostIndex={Platform.OS === 'android' ? getLastPostIndex(postIds) : -1}
                    extraData={postIds.length !== 0}
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
                    loadMorePostsVisible={this.props.loadMorePostsVisible}
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
