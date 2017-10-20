// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Platform,
    StyleSheet,
    View
} from 'react-native';

import {General} from 'mattermost-redux/constants';

import PostList from 'app/components/post_list';
import PostListRetry from 'app/components/post_list_retry';
import RetryBarIndicator from 'app/components/retry_bar_indicator';

class ChannelPostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadPostsIfNecessaryWithRetry: PropTypes.func.isRequired,
            loadThreadIfNecessary: PropTypes.func.isRequired,
            increasePostVisibility: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
            refreshChannelWithRetry: PropTypes.func.isRequired
        }).isRequired,
        channelDisplayName: PropTypes.string,
        channelId: PropTypes.string.isRequired,
        channelRefreshingFailed: PropTypes.bool,
        channelType: PropTypes.string,
        currentUserId: PropTypes.string,
        intl: intlShape.isRequired,
        lastViewedAt: PropTypes.number,
        navigator: PropTypes.object,
        postIds: PropTypes.array.isRequired,
        postVisibility: PropTypes.number,
        totalMessageCount: PropTypes.number,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        postVisibility: 15
    };

    constructor(props) {
        super(props);

        this.state = {
            visiblePostIds: this.getVisiblePostIds(props),
            showLoadMore: props.postIds.length >= props.postVisibility
        };
    }

    componentWillReceiveProps(nextProps) {
        const {postIds: nextPostIds} = nextProps;

        const showLoadMore = nextPostIds.length >= nextProps.postVisibility;
        let visiblePostIds = this.state.visiblePostIds;

        if (nextPostIds !== this.props.postIds || nextProps.postVisibility !== this.props.postVisibility) {
            visiblePostIds = this.getVisiblePostIds(nextProps);
        }

        this.setState({
            showLoadMore,
            visiblePostIds
        });
    }

    getVisiblePostIds = (props) => {
        return props.postIds.slice(0, props.postVisibility);
    };

    goToThread = (post) => {
        const {actions, channelId, channelDisplayName, channelType, intl, navigator, theme} = this.props;
        const rootId = (post.root_id || post.id);

        actions.loadThreadIfNecessary(post.root_id, channelId);
        actions.selectPost(rootId);

        let title;
        if (channelType === General.DM_CHANNEL) {
            title = intl.formatMessage({id: 'mobile.routes.thread_dm', defaultMessage: 'Direct Message Thread'});
        } else {
            title = intl.formatMessage({id: 'mobile.routes.thread', defaultMessage: '{channelName} Thread'}, {channelName: channelDisplayName});
        }

        const options = {
            screen: 'Thread',
            title,
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                channelId,
                rootId
            }
        };

        if (Platform.OS === 'android') {
            navigator.showModal(options);
        } else {
            navigator.push(options);
        }
    };

    loadMorePosts = () => {
        if (this.state.showLoadMore) {
            const {actions, channelId} = this.props;
            actions.increasePostVisibility(channelId);
        }
    };

    loadPostsRetry = () => {
        const {actions, channelId} = this.props;
        actions.loadPostsIfNecessaryWithRetry(channelId);
    };

    render() {
        const {
            actions,
            channelId,
            channelRefreshingFailed,
            currentUserId,
            lastViewedAt,
            navigator,
            postIds,
            theme
        } = this.props;

        const {
            showLoadMore,
            visiblePostIds
        } = this.state;

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
                    loadMore={this.loadMorePosts}
                    showLoadMore={showLoadMore}
                    onPostPress={this.goToThread}
                    onRefresh={actions.setChannelRefreshing}
                    renderReplies={true}
                    indicateNewMessages={true}
                    currentUserId={currentUserId}
                    lastViewedAt={lastViewedAt}
                    channelId={channelId}
                    navigator={navigator}
                />
            );
        }

        return (
            <View style={style.container}>
                {component}
                <RetryBarIndicator/>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1
    }
});

export default injectIntl(ChannelPostList);
