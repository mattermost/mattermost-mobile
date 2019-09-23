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
import {getLastValidPostId} from 'app/utils/post';
import tracker from 'app/utils/time_tracker';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import ephemeralStore from 'app/store/ephemeral_store';
import telemetry from 'app/telemetry';

let ChannelIntro = null;
let LoadMorePosts = null;

export default class ChannelPostList extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string,
        currentUserId: PropTypes.string,
        goToScreen: PropTypes.func.isRequired,
        lastViewedAt: PropTypes.number,
        loadMorePostsAbove: PropTypes.func.isRequired,
        loadMorePostsVisible: PropTypes.bool.isRequired,
        loadPostsWithRetry: PropTypes.func.isRequired,
        loadThreadIfNeeded: PropTypes.func.isRequired,
        postIds: PropTypes.array,
        recordLoadTime: PropTypes.func.isRequired,
        refreshChannelWithRetry: PropTypes.func.isRequired,
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
        this.state = {
            channelRefreshingFailed: false, // TODO: on first load what should we do?
            loadMorePostsVisible: props.loadMorePostsVisible,
        };
    }

    componentDidMount() {
        this.mounted = true;
        EventEmitter.on('goToThread', this.goToThread);
    }

    componentWillReceiveProps(nextProps) {
        const {channelId, loadMorePostsVisible} = nextProps;

        if (this.props.channelId !== channelId) {
            this.isLoadingMoreTop = false;
            this.setState({loadMorePostsVisible});
            this.detectIfPostsLoadingChanged();
        } else if (this.props.loadMorePostsVisible !== loadMorePostsVisible) {
            this.setState({loadMorePostsVisible});
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.channelId !== this.props.channelId && tracker.channelSwitch) {
            this.props.recordLoadTime('Switch Channel', 'channelSwitch');
        }

        if (!prevProps.postIds?.length && this.props.postIds?.length > 0 && this.props.updateNativeScrollView) {
            // This is needed to re-bind the scrollview natively when getting the first posts
            this.props.updateNativeScrollView();
        }
    }

    componentWillUnmount() {
        this.mounted = false;
        EventEmitter.off('goToThread', this.goToThread);
    }

    detectIfPostsLoadingChanged = () => {
        setTimeout(() => {
            if (this.props.loadMorePostsVisible !== ephemeralStore.loadingPosts) {
                this.setState({loadMorePostsVisible: ephemeralStore.loadingPosts});
            }
        }, 1000);
    };

    goToThread = (post) => {
        telemetry.start(['post_list:thread']);
        const {channelId, goToScreen, loadThreadIfNeeded} = this.props;
        const rootId = (post.root_id || post.id);

        Keyboard.dismiss();
        loadThreadIfNeeded(rootId);

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
        const {channelId, loadMorePostsAbove, postIds} = this.props;

        if (!this.isLoadingMoreTop) {
            this.isLoadingMoreTop = true;
            const postId = getLastValidPostId(postIds);

            if (postId) {
                loadMorePostsAbove(
                    channelId,
                    getLastValidPostId(postIds),
                ).then((hasMore) => {
                    setTimeout(() => {
                        this.isLoadingMoreTop = !hasMore;
                        if (this.mounted) {
                            this.setState({loadMorePostsVisible: hasMore});
                        }
                    });
                });
            } else {
                this.isLoadingMoreTop = false;
            }
        }
    };

    loadPostsRetry = () => {
        const {channelId, loadPostsWithRetry} = this.props;
        loadPostsWithRetry(channelId);
    };

    onRefresh = async () => {
        const {refreshChannelWithRetry} = this.props;
        const posts = await refreshChannelWithRetry(this.props.channelId);

        if (posts) {
            this.setState({channelRefreshingFailed: false});
        } else {
            this.setState({channelRefreshingFailed: true});
        }
    };

    renderFooter = () => {
        if (!this.props.channelId) {
            return null;
        }

        if (this.state.loadMorePostsVisible) {
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
            channelId,
            currentUserId,
            lastViewedAt,
            postIds,
            theme,
        } = this.props;
        const {channelRefreshingFailed, loadMorePostsVisible} = this.state;

        let component;
        if (postIds?.length === 0 && (channelRefreshingFailed || !channelId)) {
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
                    lastPostIndex={Platform.OS === 'android' ? getLastPostIndex(postIds || []) : -1}
                    extraData={loadMorePostsVisible}
                    onLoadMoreUp={this.loadMorePostsTop}
                    onPostPress={this.goToThread}
                    onRefresh={this.onRefresh}
                    renderReplies={true}
                    indicateNewMessages={true}
                    currentUserId={currentUserId}
                    lastViewedAt={lastViewedAt}
                    channelId={channelId}
                    renderFooter={this.renderFooter}
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
