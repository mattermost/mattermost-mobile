// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Animated,
    Dimensions,
    Platform,
    View
} from 'react-native';

import {General} from 'mattermost-redux/constants';

import ChannelLoader from 'app/components/channel_loader';
import FormattedText from 'app/components/formatted_text';
import PostList from 'app/components/post_list';
import PostListRetry from 'app/components/post_list_retry';

const {View: AnimatedView} = Animated;
const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');

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
        currentChannelId: PropTypes.string,
        intl: intlShape.isRequired,
        loadingPosts: PropTypes.bool,
        myMember: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        posts: PropTypes.array.isRequired,
        postVisibility: PropTypes.number,
        theme: PropTypes.object.isRequired,
        networkOnline: PropTypes.bool.isRequired
    };

    static defaultProps = {
        loadingPosts: false,
        postVisibility: 0
    };

    constructor(props) {
        super(props);

        this.state = {
            loaderOpacity: new Animated.Value(1),
            retryMessageHeight: new Animated.Value(0)
        };
    }

    componentDidMount() {
        const {channel, posts, channelRefreshingFailed} = this.props;
        this.mounted = true;
        this.loadPosts(this.props.channel.id);
        if (posts.length || channel.total_msg_count === 0 || channelRefreshingFailed) {
            this.channelLoaded();
        }
    }

    componentWillReceiveProps(nextProps) {
        const {currentChannelId, channel: currentChannel} = this.props;
        const {currentChannelId: nextChannelId, channel: nextChannel, channelRefreshingFailed: nextChannelRefreshingFailed, posts: nextPosts} = nextProps;

        // Show the loader if the channel id change
        if (currentChannelId !== nextChannelId) {
            this.setState({
                loaderOpacity: new Animated.Value(1)
            }, () => {
                if (nextPosts.length || nextChannel.total_msg_count === 0 || nextChannelRefreshingFailed) {
                    this.channelLoaded();
                }
            });
        }

        if (currentChannel.id !== nextChannel.id) {
            // Load the posts when the channel actually changes
            this.loadPosts(nextChannel.id);
        }

        if (nextChannelRefreshingFailed && this.state.channelLoaded && nextPosts.length) {
            this.toggleRetryMessage();
        } else if (!nextChannelRefreshingFailed || !nextPosts.length) {
            this.toggleRetryMessage(false);
        }

        const showLoadMore = nextProps.posts.length >= nextProps.postVisibility;
        this.setState({
            showLoadMore
        });
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    channelLoaded = () => {
        Animated.timing(this.state.loaderOpacity, {
            toValue: 0,
            duration: 500
        }).start(() => {
            if (this.mounted) {
                this.setState({channelLoaded: true});
            }
        });
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

        actions.loadThreadIfNecessary(post.root_id);
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

        const {loaderOpacity, retryMessageHeight} = this.state;

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

        return (
            <View style={{flex: 1}}>
                {component}
                <AnimatedView
                    pointerEvents='none'
                    style={{
                        position: 'absolute',
                        height: deviceHeight,
                        width: deviceWidth,
                        top: 0,
                        left: 0,
                        opacity: loaderOpacity
                    }}
                >
                    <ChannelLoader theme={theme}/>
                </AnimatedView>
                <AnimatedView style={{position: 'absolute', top: 0, height: retryMessageHeight, width: deviceWidth, backgroundColor: '#fb8000', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10}}>
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

export default injectIntl(ChannelPostList);
