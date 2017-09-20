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

import ChannelLoader from 'app/components/channel_loader';
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
        channel: PropTypes.object.isRequired,
        channelIsLoading: PropTypes.bool,
        channelIsRefreshing: PropTypes.bool,
        channelRefreshingFailed: PropTypes.bool,
        intl: intlShape.isRequired,
        loadingPosts: PropTypes.bool,
        myMember: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        posts: PropTypes.array.isRequired,
        postVisibility: PropTypes.number,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        loadingPosts: false,
        postVisibility: 0
    };

    constructor(props) {
        super(props);

        this.state = {
            retryMessageHeight: new Animated.Value(0)
        };
    }

    componentDidMount() {
        const {channel, posts, channelRefreshingFailed} = this.props;
        this.mounted = true;
        this.loadPosts(this.props.channel.id);
        this.shouldMarkChannelAsLoaded(posts.length, channel.total_msg_count === 0, channelRefreshingFailed);
    }

    componentWillReceiveProps(nextProps) {
        const {channel: currentChannel} = this.props;
        const {channel: nextChannel, channelRefreshingFailed: nextChannelRefreshingFailed, posts: nextPosts} = nextProps;

        if (currentChannel.id !== nextChannel.id) {
            // Load the posts when the channel actually changes
            this.loadPosts(nextChannel.id);
        }

        if (nextChannelRefreshingFailed && this.state.channelLoaded && nextPosts.length) {
            this.toggleRetryMessage();
        } else if (!nextChannelRefreshingFailed || !nextPosts.length) {
            this.toggleRetryMessage(false);
        }

        this.shouldMarkChannelAsLoaded(nextPosts.length, nextChannel.total_msg_count === 0, nextChannelRefreshingFailed);

        const showLoadMore = nextProps.posts.length >= nextProps.postVisibility;
        this.setState({
            showLoadMore
        });
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    shouldMarkChannelAsLoaded = (postsCount, channelHasMessages, channelRefreshingFailed) => {
        if (postsCount || channelHasMessages || channelRefreshingFailed) {
            this.channelLoaded();
        }
    };

    channelLoaded = () => {
        this.setState({channelLoaded: true});
    };

    toggleRetryMessage = (show = true) => {
        const value = show ? 38 : 0;
        Animated.timing(this.state.retryMessageHeight, {
            toValue: value,
            duration: 350
        }).start();
    };

    goToThread = (post) => {
        const {actions, channel, intl, navigator, theme} = this.props;
        const channelId = post.channel_id;
        const rootId = (post.root_id || post.id);

        actions.loadThreadIfNecessary(post.root_id, channelId);
        actions.selectPost(rootId);

        let title;
        if (channel.type === General.DM_CHANNEL) {
            title = intl.formatMessage({id: 'mobile.routes.thread_dm', defaultMessage: 'Direct Message Thread'});
        } else {
            const channelName = channel.display_name;
            title = intl.formatMessage({id: 'mobile.routes.thread', defaultMessage: '{channelName} Thread'}, {channelName});
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
            const {actions, channel} = this.props;
            actions.increasePostVisibility(channel.id);
        }
    };

    loadPosts = (channelId) => {
        this.setState({channelLoaded: false});
        this.props.actions.loadPostsIfNecessaryWithRetry(channelId);
    };

    render() {
        const {
            channel,
            channelIsLoading,
            channelIsRefreshing,
            channelRefreshingFailed,
            loadingPosts,
            myMember,
            navigator,
            posts,
            postVisibility,
            theme
        } = this.props;

        const {retryMessageHeight} = this.state;

        let component;
        if (!posts.length && channelRefreshingFailed) {
            component = (
                <PostListRetry
                    retry={() => this.loadPosts(channel.id)}
                    theme={theme}
                />
            );
        } else if (channelIsLoading) {
            component = <ChannelLoader theme={theme}/>;
        } else {
            component = (
                <PostList
                    posts={posts.slice(0, postVisibility)}
                    loadMore={this.loadMorePosts}
                    isLoadingMore={loadingPosts}
                    showLoadMore={this.state.showLoadMore}
                    onPostPress={this.goToThread}
                    renderReplies={true}
                    indicateNewMessages={true}
                    currentUserId={myMember.user_id}
                    lastViewedAt={myMember.last_viewed_at}
                    channel={channel}
                    navigator={navigator}
                    refreshing={channelIsRefreshing}
                    channelIsLoading={channelIsLoading}
                />
            );
        }

        const refreshIndicatorDimensions = {
            height: retryMessageHeight
        };

        return (
            <View style={{flex: 1}}>
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
