// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {
    ListView,
    StyleSheet,
    View
} from 'react-native';

import {General, Posts} from 'mattermost-redux/constants';
import {addDatesToPostList} from 'mattermost-redux/utils/post_utils';

import ChannelIntro from 'app/components/channel_intro';
import Post from 'app/components/post';
import DateHeader from './date_header';
import LoadMorePosts from './load_more_posts';
import NewMessagesDivider from './new_messages_divider';

const LOAD_MORE_POSTS = 'load-more-posts';

export default class PostList extends Component {
    static propTypes = {
        channel: PropTypes.object,
        channelIsLoading: PropTypes.bool.isRequired,
        posts: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
        loadMore: PropTypes.func,
        isLoadingMore: PropTypes.bool,
        showLoadMore: PropTypes.bool,
        onPostPress: PropTypes.func,
        renderReplies: PropTypes.bool,
        indicateNewMessages: PropTypes.bool,
        currentUserId: PropTypes.string,
        lastViewedAt: PropTypes.number
    };

    static defaultProps = {
        channel: {}
    };

    constructor(props) {
        super(props);
        this.state = {
            posts: this.getPostsWithDates(props),
            dataSource: new ListView.DataSource({
                rowHasChanged: (a, b) => a !== b
            })
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.posts !== this.props.posts) {
            const posts = this.getPostsWithDates(nextProps);
            this.setState({posts});
        }
    }

    getPostsWithDates(props) {
        const {posts, indicateNewMessages, currentUserId, lastViewedAt} = props;
        return addDatesToPostList(posts, {indicateNewMessages, currentUserId, lastViewedAt});
    }

    getPostsWithLoadMore() {
        const {showLoadMore} = this.props;
        const {posts} = this.state;
        if (showLoadMore) {
            return [...posts, LOAD_MORE_POSTS];
        }
        return posts;
    }

    loadMore = () => {
        const {loadMore} = this.props;
        if (typeof loadMore === 'function') {
            loadMore();
        }
    };

    renderChannelIntro = () => {
        const {channel, channelIsLoading, posts} = this.props;

        if (channel.hasOwnProperty('id')) {
            const firstPostHasRendered = channel.total_msg_count ? posts.length > 0 : true;
            const messageCount = channel.total_msg_count - posts.length;
            if (channelIsLoading || !firstPostHasRendered || messageCount > Posts.POST_CHUNK_SIZE) {
                return null;
            }

            return (
                <View style={style.row}>
                    <ChannelIntro/>
                </View>
            );
        }

        return null;
    };

    renderRow = (row) => {
        if (row instanceof Date) {
            return this.renderDateHeader(row);
        }
        if (row === General.START_OF_NEW_MESSAGES) {
            return (
                <NewMessagesDivider
                    theme={this.props.theme}
                    style={style.row}
                />
            );
        }
        if (row === LOAD_MORE_POSTS) {
            return (
                <LoadMorePosts
                    loading={this.props.isLoadingMore}
                    theme={this.props.theme}
                    style={style.row}
                />
            );
        }

        return this.renderPost(row);
    };

    renderDateHeader = (date) => {
        return (
            <DateHeader
                theme={this.props.theme}
                style={style.row}
                date={date}
            />
        );
    };

    renderPost = (post) => {
        return (
            <Post
                style={style.row}
                post={post}
                renderReplies={this.props.renderReplies}
                isFirstReply={post.isFirstReply}
                isLastReply={post.isLastReply}
                commentedOnPost={post.commentedOnPost}
                onPress={this.props.onPostPress}
            />
        );
    };

    render() {
        return (
            <ListView
                style={style.container}
                dataSource={this.state.dataSource.cloneWithRows(this.getPostsWithLoadMore())}
                renderFooter={this.renderChannelIntro}
                renderRow={this.renderRow}
                onEndReached={this.loadMore}
                enableEmptySections={true}
                showsVerticalScrollIndicator={false}
                initialListSize={30}
                onEndReachedThreshold={200}
                pageSize={10}
            />
        );
    }
}

const style = StyleSheet.create({
    container: {
        transform: [{rotate: '180deg'}]
    },
    row: {
        transform: [{rotate: '180deg'}]
    }
});
