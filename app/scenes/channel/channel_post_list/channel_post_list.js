// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';

import {Constants, RequestStatus} from 'mattermost-redux/constants';

import Loading from 'app/components/loading';
import PostList from 'app/components/post_list';

export default class ChannelPostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadPostsIfNecessary: PropTypes.func.isRequired,
            getPostsBefore: PropTypes.func.isRequired,
            goToThread: PropTypes.func.isRequired
        }).isRequired,
        channel: PropTypes.object.isRequired,
        myMember: PropTypes.object.isRequired,
        postsRequests: PropTypes.shape({
            getPosts: PropTypes.object.isRequired,
            getPostsBefore: PropTypes.object.isRequired,
            getPostsSince: PropTypes.object.isRequired
        }).isRequired,
        posts: PropTypes.array.isRequired
    };

    state = {
        didInitialPostsLoad: false,
        hasFirstPost: false,
        lastViewedAt: this.props.myMember.last_viewed_at
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
                hasFirstPost = nextProps.posts.length < Constants.POST_CHUNK_SIZE;
            } else if (didMorePostsLoad) {
                hasFirstPost = (nextProps.posts.length - this.props.posts.length) < Constants.POST_CHUNK_SIZE;
            }
            if (hasFirstPost) {
                this.setState({hasFirstPost});
            }
        } else {
            this.setState({
                didInitialPostsLoad: false,
                hasFirstPost: false,
                lastViewedAt: nextProps.myMember.last_viewed_at
            });
            this.props.actions.loadPostsIfNecessary(nextProps.channel);
        }
    }

    didPostsLoad(nextProps, postsRequest) {
        const nextGetPostsStatus = nextProps.postsRequests[postsRequest].status;
        const getPostsStatus = this.props.postsRequests[postsRequest].status;
        return getPostsStatus === RequestStatus.STARTED && nextGetPostsStatus === RequestStatus.SUCCESS;
    }

    loadMorePosts = () => {
        const {channel, posts} = this.props;
        const {team_id: teamId, id: channelId} = channel;
        const oldestPost = posts[posts.length - 1];
        const {didInitialPostsLoad, hasFirstPost} = this.state;
        if (didInitialPostsLoad && !hasFirstPost && oldestPost) {
            return this.props.actions.getPostsBefore(teamId, channelId, oldestPost.id);
        }
        return null;
    };

    goToThread = (post) => {
        this.props.actions.goToThread(post.channel_id, post.root_id || post.id);
    };

    render() {
        const {posts, postsRequests} = this.props;
        if (!posts || (postsRequests.getPosts.status === RequestStatus.STARTED && !this.state.didInitialPostsLoad)) {
            return <Loading/>;
        }

        return (
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
            />
        );
    }
}
