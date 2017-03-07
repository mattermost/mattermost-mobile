// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {
    ListView,
    StyleSheet
} from 'react-native';

import Post from 'app/components/post';
import DateHeader from './date_header';
import LoadMorePosts from './load_more_posts';
import NewMessagesDivider from './new_messages_divider';

import {Constants} from 'service/constants';
import {addDatesToPostList} from 'service/utils/post_utils';

const style = StyleSheet.create({
    container: {
        transform: [{rotate: '180deg'}]
    },
    row: {
        transform: [{rotate: '180deg'}]
    }
});

const LOAD_MORE_POSTS = 'load-more-posts';

export default class PostList extends Component {
    static propTypes = {
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

    renderRow = (row) => {
        if (row instanceof Date) {
            return this.renderDateHeader(row);
        }
        if (row === Constants.START_OF_NEW_MESSAGES) {
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
                renderRow={this.renderRow}
                onEndReached={this.loadMore}
                renderSectionHeader={this.renderSectionHeader}
                enableEmptySections={true}
                showsVerticalScrollIndicator={false}
            />
        );
    }
}
