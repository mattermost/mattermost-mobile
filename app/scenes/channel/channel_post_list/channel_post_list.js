// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import PostList from 'app/components/post_list';

export default class ChannelPostList extends React.Component {
    static propTypes = {
        actions: React.PropTypes.shape({
            loadPostsIfNecessary: React.PropTypes.func.isRequired,
            goToThread: React.PropTypes.func.isRequired
        }).isRequired,
        channel: React.PropTypes.object.isRequired,
        posts: React.PropTypes.array.isRequired
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
    }

    render() {
        if (!this.props.posts) {
            return <Text>{'waiting on posts'}</Text>;
        }

        return (
            <PostList
                posts={this.props.posts}
                onPostPress={this.goToThread}
                renderReplies={true}
            />
        );
    }
}
