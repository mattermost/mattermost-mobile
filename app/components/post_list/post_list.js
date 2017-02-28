// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {
    ListView,
    StyleSheet
} from 'react-native';

import Post from 'app/components/post';
import DateHeader from './date_header';
import LoadMoreButton from './load_more_button';
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
            dataSource: new ListView.DataSource({
                rowHasChanged: (a, b) => a !== b
            }).cloneWithRows(this.getPostsWithDates(props))
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.posts !== this.props.posts) {
            const dataSource = this.state.dataSource.cloneWithRows(this.getPostsWithDates(nextProps));
            this.setState({dataSource});
        }
    }

    getPostsWithDates(props) {
        const {posts, indicateNewMessages, currentUserId, lastViewedAt} = props;
        return addDatesToPostList(posts, {indicateNewMessages, currentUserId, lastViewedAt});
    }

    loadMore = () => {
        const {allowLoadMore, loadMore, postsRequests} = this.props;
        const initialPostsLoaded = postsRequests.getPosts.status === RequestStatus.SUCCESS;
        if (allowLoadMore && typeof loadMore === 'function' && initialPostsLoaded) {
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
        if (row === 'load-more-posts') {
            return (
                <LoadMoreButton
                    loadMore={this.props.loadMore}
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
