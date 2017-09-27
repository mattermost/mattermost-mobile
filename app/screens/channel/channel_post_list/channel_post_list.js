// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Animated,
    Platform,
    StyleSheet,
    View
} from 'react-native';

import {General} from 'mattermost-redux/constants';

import FormattedText from 'app/components/formatted_text';
import PostList from 'app/components/post_list';
import PostListRetry from 'app/components/post_list_retry';

const {View: AnimatedView} = Animated;

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
        channelIsRefreshing: PropTypes.bool,
        channelRefreshingFailed: PropTypes.bool,
        channelType: PropTypes.string,
        currentUserId: PropTypes.string,
        intl: intlShape.isRequired,
        lastViewedAt: PropTypes.number,
        loadingPosts: PropTypes.bool,
        navigator: PropTypes.object,
        posts: PropTypes.array.isRequired,
        postVisibility: PropTypes.number,
        totalMessageCount: PropTypes.number,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        posts: [],
        loadingPosts: false,
        postVisibility: 30
    };

    constructor(props) {
        super(props);

        this.state = {
            retryMessageHeight: new Animated.Value(0),
            visiblePosts: this.getVisiblePosts(props),
            showLoadMore: props.posts.length >= props.postVisibility
        };
    }

    componentDidMount() {
        const {channelId} = this.props;
        this.mounted = true;
        this.loadPosts(channelId);
    }

    componentWillReceiveProps(nextProps) {
        const {channelId: currentChannelId} = this.props;
        const {channelId: nextChannelId, channelRefreshingFailed: nextChannelRefreshingFailed, posts: nextPosts} = nextProps;

        if (currentChannelId !== nextChannelId) {
            // Load the posts when the channel actually changes
            this.loadPosts(nextChannelId);
        }

        if (nextChannelRefreshingFailed && nextPosts.length) {
            this.toggleRetryMessage();
        } else if (!nextChannelRefreshingFailed || !nextPosts.length) {
            this.toggleRetryMessage(false);
        }

        const showLoadMore = nextProps.posts.length >= nextProps.postVisibility;
        let visiblePosts = this.state.visiblePosts;

        if (nextProps.posts !== this.props.posts || nextProps.postVisibility !== this.props.postVisibility) {
            visiblePosts = this.getVisiblePosts(nextProps);
        }

        this.setState({
            showLoadMore,
            visiblePosts
        });
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getVisiblePosts = (props) => {
        return props.posts.slice(0, props.postVisibility);
    };

    toggleRetryMessage = (show = true) => {
        const value = show ? 38 : 0;
        Animated.timing(this.state.retryMessageHeight, {
            toValue: value,
            duration: 350
        }).start();
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
            // console.warn('loadMorePosts');
            const {actions, channelId} = this.props;
            actions.increasePostVisibility(channelId);
        }
    };

    loadPosts = (channelId) => {
        this.props.actions.loadPostsIfNecessaryWithRetry(channelId);
    };

    loadPostsRetry = () => {
        this.loadPosts(this.props.channelId);
    };

    render() {
        const {
            actions,
            channelId,
            channelIsRefreshing,
            channelRefreshingFailed,
            currentUserId,
            lastViewedAt,
            loadingPosts,
            navigator,
            posts,
            theme
        } = this.props;

        const {
            retryMessageHeight,
            showLoadMore,
            visiblePosts
        } = this.state;

        let component;
        if (!posts.length && channelRefreshingFailed) {
            component = (
                <PostListRetry
                    retry={this.loadPostsRetry}
                    theme={theme}
                />
            );
        } else {
            component = (
                <PostList
                    posts={visiblePosts}
                    loadMore={this.loadMorePosts}
                    isLoadingMore={loadingPosts}
                    showLoadMore={showLoadMore}
                    onPostPress={this.goToThread}
                    onRefresh={actions.setChannelRefreshing}
                    renderReplies={true}
                    indicateNewMessages={true}
                    currentUserId={currentUserId}
                    lastViewedAt={lastViewedAt}
                    channelId={channelId}
                    navigator={navigator}
                    refreshing={channelIsRefreshing}
                />
            );
        }

        const refreshIndicatorDimensions = {
            height: retryMessageHeight
        };

        return (
            <View style={style.container}>
                {component}
                <AnimatedView style={[style.refreshIndicator, refreshIndicatorDimensions]}>
                    <FormattedText
                        id='mobile.retry_message'
                        defaultMessage='Refreshing messages failed. Pull up to try again.'
                        style={{color: 'white', flex: 1, fontSize: 12}}
                    />
                </AnimatedView>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1
    },
    refreshIndicator: {
        alignItems: 'center',
        backgroundColor: '#fb8000',
        flexDirection: 'row',
        paddingHorizontal: 10,
        position: 'absolute',
        top: 0,
        overflow: 'hidden',
        width: '100%'
    }
});

export default injectIntl(ChannelPostList);
