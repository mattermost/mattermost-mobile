// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';

import PostList from 'app/components/post_list';

export default class ChannelPostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadPostsIfNecessary: PropTypes.func.isRequired,
            goToThread: PropTypes.func.isRequired
        }).isRequired,
        channel: PropTypes.object.isRequired,
        myMember: PropTypes.object.isRequired,
        posts: PropTypes.array.isRequired
    };

    componentDidMount() {
        this.props.actions.loadPostsIfNecessary(this.props.channel);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.channel.id !== nextProps.channel.id) {
            this.props.actions.loadPostsIfNecessary(nextProps.channel);
        }
    }

    goToThread = (post) => {
        this.props.actions.goToThread(post.channel_id, post.root_id || post.id);
    };

    render() {
        if (!this.props.posts) {
            return <Text>{'waiting on posts'}</Text>;
        }

        return (
            <PostList
                posts={this.props.posts}
                onPostPress={this.goToThread}
                renderReplies={true}
                indicateNewMessages={true}
                lastViewedAt={this.props.myMember.last_viewed_at}
            />
        );
    }
}
