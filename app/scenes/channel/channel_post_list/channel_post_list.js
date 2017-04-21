// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Animated,
    Dimensions,
    View
} from 'react-native';

import {General, Posts, RequestStatus} from 'mattermost-redux/constants';

import ChannelLoader from 'app/components/channel_loader';
import PostList from 'app/components/post_list';
import PostListRetry from 'app/components/post_list_retry';

const {View: AnimatedView} = Animated;
const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');

export default class ChannelPostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadPostsIfNecessary: PropTypes.func.isRequired,
            getPostsBefore: PropTypes.func.isRequired,
            goToThread: PropTypes.func.isRequired
        }).isRequired,
        applicationInitializing: PropTypes.bool.isRequired,
        channel: PropTypes.object.isRequired,
        channelIsLoading: PropTypes.bool,
        myMember: PropTypes.object.isRequired,
        postsRequests: PropTypes.shape({
            getPosts: PropTypes.object.isRequired,
            getPostsBefore: PropTypes.object.isRequired,
            getPostsSince: PropTypes.object.isRequired
        }).isRequired,
        posts: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
        networkOnline: PropTypes.bool.isRequired
    };

    state = {
        didInitialPostsLoad: false,
        hasFirstPost: false,
        lastViewedAt: this.props.myMember.last_viewed_at,
        loaderOpacity: new Animated.Value(1)
    };

    componentDidMount() {
        this.props.actions.loadPostsIfNecessary(this.props.channel);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.channel.id === nextProps.channel.id) {
            const didInitialPostsLoad = this.didPostsLoad(nextProps, 'getPosts') ||
                this.didPostsLoad(nextProps, 'getPostsSince');
            if (didInitialPostsLoad) {
                this.setState({didInitialPostsLoad});
            }
            const didMorePostsLoad = this.didPostsLoad(nextProps, 'getPostsBefore');
            let hasFirstPost = false;
            if (didInitialPostsLoad) {
                hasFirstPost = nextProps.posts.length < Posts.POST_CHUNK_SIZE;
            } else if (didMorePostsLoad) {
                hasFirstPost = (nextProps.posts.length - this.props.posts.length) < General.POST_CHUNK_SIZE;
            }
            if (hasFirstPost) {
                this.setState({hasFirstPost});
            }
            if (!nextProps.applicationInitializing) {
                this.loaderAnimationRunner();
            }
        } else {
            this.setState({
                didInitialPostsLoad: false,
                hasFirstPost: false,
                lastViewedAt: nextProps.myMember.last_viewed_at,
                loaderOpacity: new Animated.Value(1)
            });
            this.props.actions.loadPostsIfNecessary(nextProps.channel);
        }
    }

    loaderAnimationRunner = () => {
        Animated.timing(this.state.loaderOpacity, {
            toValue: 0,
            duration: 500
        }).start();
    };

    didPostsLoad(nextProps, postsRequest) {
        const nextGetPostsStatus = nextProps.postsRequests[postsRequest].status;
        const getPostsStatus = this.props.postsRequests[postsRequest].status;
        return getPostsStatus === RequestStatus.STARTED && nextGetPostsStatus === RequestStatus.SUCCESS;
    }

    loadMorePosts = () => {
        const {channel, posts, postsRequests} = this.props;
        const {id: channelId} = channel;
        const oldestPost = posts[posts.length - 1];
        const {didInitialPostsLoad, hasFirstPost} = this.state;
        if (didInitialPostsLoad && !hasFirstPost && oldestPost && postsRequests.getPostsBefore.status !== RequestStatus.STARTED) {
            return this.props.actions.getPostsBefore(channelId, oldestPost.id);
        }
        return null;
    };

    goToThread = (post) => {
        this.props.actions.goToThread(post.channel_id, post.root_id || post.id);
    };

    render() {
        const {
            actions,
            applicationInitializing,
            channel,
            channelIsLoading,
            posts,
            postsRequests,
            theme,
            networkOnline
        } = this.props;

        let component;
        if (!posts.length && channel.total_msg_count > 0 && (postsRequests.getPosts.status === RequestStatus.FAILURE || !networkOnline)) {
            component = (
                <PostListRetry
                    retry={() => actions.loadPostsIfNecessary(channel)}
                    theme={theme}
                />
            );
        } else if (!applicationInitializing && !channelIsLoading && posts && (postsRequests.getPosts.status !== RequestStatus.STARTED || !this.state.didInitialPostsLoad)) {
            component = (
                <PostList
                    posts={posts}
                    loadMore={this.loadMorePosts}
                    isLoadingMore={postsRequests.getPostsBefore.status === RequestStatus.STARTED}
                    showLoadMore={posts.length > 0 && !this.state.hasFirstPost}
                    onPostPress={this.goToThread}
                    renderReplies={true}
                    indicateNewMessages={true}
                    currentUserId={this.props.myMember.user_id}
                    lastViewedAt={this.state.lastViewedAt}
                    channel={channel}
                />
            );
        } else {
            component = <ChannelLoader theme={theme}/>;
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
                        opacity: this.state.loaderOpacity
                    }}
                >
                    <ChannelLoader theme={theme}/>
                </AnimatedView>
            </View>
        );
    }
}
