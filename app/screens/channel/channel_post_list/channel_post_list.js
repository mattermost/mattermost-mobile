// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {
    Platform,
    StyleSheet,
    View,
    InteractionManager,
} from 'react-native';

import {debounce} from 'mattermost-redux/actions/helpers';

import AnnouncementBanner from 'app/components/announcement_banner';
import PostList from 'app/components/post_list';
import PostListRetry from 'app/components/post_list_retry';
import RetryBarIndicator from 'app/components/retry_bar_indicator';
import tracker from 'app/utils/time_tracker';

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
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        channelRefreshingFailed: PropTypes.bool,
        currentUserId: PropTypes.string,
        lastViewedAt: PropTypes.number,
        loadMorePostsVisible: PropTypes.bool.isRequired,
        navigator: PropTypes.object,
        postIds: PropTypes.array.isRequired,
        postVisibility: PropTypes.number,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        postVisibility: 15,
    };

    constructor(props) {
        super(props);

        this.state = {
            visiblePostIds: this.getVisiblePostIds(props),
            loading: true,
        };
    }

    componentWillReceiveProps(nextProps) {
        const {postIds: nextPostIds} = nextProps;

        let visiblePostIds = this.state.visiblePostIds;
        const channelSwitch = nextProps.channelId !== this.props.channelId;

        if (nextPostIds !== this.props.postIds || nextProps.postVisibility !== this.props.postVisibility) {
            visiblePostIds = this.getVisiblePostIds(nextProps);
        }

        this.setState({
            visiblePostIds,
            loading: channelSwitch,
        }, () => InteractionManager.runAfterInteractions(() => {
            if (channelSwitch) {
                this.setState({loading: false});
            }
        }));
    }

    componentDidUpdate(prevProps) {
        if (prevProps.channelId !== this.props.channelId && tracker.channelSwitch) {
            this.props.actions.recordLoadTime('Switch Channel', 'channelSwitch');
        }
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => this.setState({loading: false}));
    }

    getVisiblePostIds = (props) => {
        return props.postIds.slice(0, props.postVisibility);
    };

    goToThread = (post) => {
        const {actions, channelId, navigator, theme} = this.props;
        const rootId = (post.root_id || post.id);

        actions.loadThreadIfNecessary(post.root_id, channelId);
        actions.selectPost(rootId);

        const options = {
            screen: 'Thread',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                channelId,
                rootId,
            },
        };

        if (Platform.OS === 'android') {
            navigator.showModal(options);
        } else {
            navigator.push(options);
        }
    };

    loadMorePosts = debounce(() => {
        if (this.props.loadMorePostsVisible) {
            const {actions, channelId} = this.props;
            actions.increasePostVisibility(channelId);
        }
    }, 100);

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
                    loadMore={this.loadMorePosts}
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
                navigator={this.props.navigator}
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
            navigator,
            postIds,
            theme,
        } = this.props;

        const {
            visiblePostIds,
            loading,
        } = this.state;

        if (loading) {
            return null;
        }

        let component;

        if (!postIds.length && channelRefreshingFailed) {
            component = (
                <PostListRetry
                    retry={this.loadPostsRetry}
                    theme={theme}
                />
            );
        } else {
            component = (
                <PostList
                    postIds={visiblePostIds}
                    extraData={loadMorePostsVisible}
                    onEndReached={this.loadMorePosts}
                    onPostPress={this.goToThread}
                    onRefresh={actions.setChannelRefreshing}
                    renderReplies={true}
                    indicateNewMessages={true}
                    currentUserId={currentUserId}
                    lastViewedAt={lastViewedAt}
                    channelId={channelId}
                    navigator={navigator}
                    renderFooter={this.renderFooter}
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
