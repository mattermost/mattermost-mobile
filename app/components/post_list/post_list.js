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

import {Constants, RequestStatus} from 'service/constants';
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
        postsRequests: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        allowLoadMore: PropTypes.bool,
        loadMore: PropTypes.func,
        onPostPress: PropTypes.func,
        renderReplies: PropTypes.bool,
        indicateNewMessages: PropTypes.bool,
        currentUserId: PropTypes.string,
        lastViewedAt: PropTypes.number
    };

    constructor(props) {
        super(props);
        this.state = {
            hasFirstPost: false,
            didInitialPostsLoad: false,
            dataSource: new ListView.DataSource({
                rowHasChanged: (a, b) => a !== b
            }).cloneWithRows(this.getPostsWithDates(props))
        };
    }

    componentWillReceiveProps(nextProps) {
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
        if (nextProps.posts !== this.props.posts) {
            const dataSource = this.state.dataSource.cloneWithRows(this.getPostsWithDates(nextProps, hasFirstPost));
            this.setState({dataSource});
        }
    }

    getPostsWithDates(props, hasFirstPost = false) {
        const {posts, allowLoadMore, indicateNewMessages, currentUserId, lastViewedAt} = props;
        const postsWithDates = addDatesToPostList(posts, {indicateNewMessages, currentUserId, lastViewedAt});
        if (allowLoadMore && postsWithDates.length && !hasFirstPost) {
            postsWithDates.push(LOAD_MORE_POSTS);
        }
        return postsWithDates;
    }

    didPostsLoad(nextProps, postsRequest) {
        const nextGetPostsStatus = nextProps.postsRequests[postsRequest].status;
        const getPostsStatus = this.props.postsRequests[postsRequest].status;
        return getPostsStatus === RequestStatus.STARTED && nextGetPostsStatus === RequestStatus.SUCCESS;
    }

    loadMore = () => {
        const {allowLoadMore, loadMore} = this.props;
        const {didInitialPostsLoad, hasFirstPost} = this.state;
        if (allowLoadMore && typeof loadMore === 'function' && didInitialPostsLoad && !hasFirstPost) {
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
                    loading={this.props.postsRequests.getPostsBefore.status === RequestStatus.STARTED}
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
                dataSource={this.state.dataSource}
                renderRow={this.renderRow}
                onEndReached={this.loadMore}
                renderSectionHeader={this.renderSectionHeader}
                enableEmptySections={true}
                showsVerticalScrollIndicator={false}
            />
        );
    }
}
