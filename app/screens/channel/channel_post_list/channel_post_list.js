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
import PostList from 'app/components/post_list';
import PostListRetry from 'app/components/post_list_retry';

const {View: AnimatedView} = Animated;
const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');

class ChannelPostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadPostsIfNecessary: PropTypes.func.isRequired,
            loadThreadIfNecessary: PropTypes.func.isRequired,
            increasePostVisibility: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired
        }).isRequired,
        channel: PropTypes.object.isRequired,
        channelIsLoading: PropTypes.bool,
        channelIsRefreshing: PropTypes.bool,
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
            loaderOpacity: new Animated.Value(1)
        };
    }

    componentDidMount() {
        this.mounted = true;
        this.loadPosts(this.props.channel.id);
    }

    componentWillReceiveProps(nextProps) {
        // Show the loader if the channel id change
        if (this.props.currentChannelId !== nextProps.currentChannelId) {
            this.setState({
                loaderOpacity: new Animated.Value(1)
            });
        }

        if (this.props.channel.id !== nextProps.channel.id) {
            // Load the posts when the channel actually changes
            this.loadPosts(nextProps.channel.id);
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

    loadPosts = async (channelId) => {
        this.setState({channelLoaded: false});
        await this.props.actions.loadPostsIfNecessary(channelId);
        this.channelLoaded();
    };

    render() {
        const {
            channel,
            channelIsLoading,
            channelIsRefreshing,
            loadingPosts,
            myMember,
            navigator,
            networkOnline,
            posts,
            postVisibility,
            theme
        } = this.props;

        const {channelLoaded, loaderOpacity} = this.state;

        let component;
        if (!posts.length && channel.total_msg_count > 0 && (!channelIsLoading || !networkOnline)) {
            // If no posts has been loaded and we are offline
            component = (
                <PostListRetry
                    retry={() => this.loadPosts(channel.id)}
                    theme={theme}
                />
            );
        } else if ((channelIsLoading || !channelLoaded) && !channelIsRefreshing && !loadingPosts) {
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
            </View>
        );
    }
}

export default injectIntl(ChannelPostList);
