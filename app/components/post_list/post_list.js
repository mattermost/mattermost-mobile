// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View
} from 'react-native';
import FlatList from 'app/components/inverted_flat_list';

import {General} from 'mattermost-redux/constants';
import {addDatesToPostList} from 'mattermost-redux/utils/post_utils';

import ChannelIntro from 'app/components/channel_intro';
import Post from 'app/components/post';
import DateHeader from './date_header';
import LoadMorePosts from './load_more_posts';
import NewMessagesDivider from './new_messages_divider';

const LOAD_MORE_POSTS = 'load-more-posts';

export default class PostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            refreshChannelWithRetry: PropTypes.func.isRequired
        }).isRequired,
        channelId: PropTypes.string,
        currentUserId: PropTypes.string,
        indicateNewMessages: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        lastViewedAt: PropTypes.number,
        loadMore: PropTypes.func,
        navigator: PropTypes.object,
        onPostPress: PropTypes.func,
        onRefresh: PropTypes.func,
        posts: PropTypes.array.isRequired,
        renderReplies: PropTypes.bool,
        showLoadMore: PropTypes.bool,
        shouldRenderReplyButton: PropTypes.bool,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        loadMore: () => true
    };

    componentDidUpdate(prevProps) {
        if (prevProps.channelId !== this.props.channelId && this.refs.list) {
            // When switching channels make sure we start from the bottom
            this.refs.list.scrollToOffset({y: 0, animated: false});
        }
    }

    getPostsWithDates = () => {
        const {posts, indicateNewMessages, currentUserId, lastViewedAt, showLoadMore} = this.props;
        const list = addDatesToPostList(posts, {indicateNewMessages, currentUserId, lastViewedAt});
        if (showLoadMore) {
            return [...list, LOAD_MORE_POSTS];
        }

        return list;
    };

    keyExtractor = (item) => {
        if (item instanceof Date) {
            return item.getTime();
        }

        return item.id || item;
    };

    onRefresh = () => {
        const {
            actions,
            channelId,
            onRefresh
        } = this.props;

        if (channelId) {
            actions.refreshChannelWithRetry(channelId);
        }

        if (onRefresh) {
            onRefresh();
        }
    };

    renderChannelIntro = () => {
        const {channelId, navigator, showLoadMore} = this.props;

        // FIXME: Only show the channel intro when we are at the very start of the channel
        if (channelId && !showLoadMore) {
            return (
                <View>
                    <ChannelIntro navigator={navigator}/>
                </View>
            );
        }

        return null;
    };

    renderDateHeader = (date) => {
        return (
            <DateHeader
                theme={this.props.theme}
                date={date}
            />
        );
    };

    renderItem = ({item}) => {
        if (item instanceof Date) {
            return this.renderDateHeader(item);
        }
        if (item === General.START_OF_NEW_MESSAGES) {
            return (
                <NewMessagesDivider
                    theme={this.props.theme}
                />
            );
        }
        if (item === LOAD_MORE_POSTS && this.props.showLoadMore) {
            return (
                <LoadMorePosts theme={this.props.theme}/>
            );
        }

        return this.renderPost(item);
    };

    getItem = (data, index) => data[index];

    getItemCount = (data) => data.length;

    renderPost = (post) => {
        const {
            isSearchResult,
            navigator,
            onPostPress,
            renderReplies,
            shouldRenderReplyButton
        } = this.props;

        return (
            <Post
                highlight={post.highlight}
                postId={post.id}
                renderReplies={renderReplies}
                isFirstReply={post.isFirstReply}
                isLastReply={post.isLastReply}
                isSearchResult={isSearchResult}
                shouldRenderReplyButton={shouldRenderReplyButton}
                commentedOnPost={post.commentedOnPost}
                onPress={onPostPress}
                navigator={navigator}
            />
        );
    };

    render() {
        const {channelId, loadMore, theme} = this.props;

        const refreshControl = {
            refreshing: false
        };

        if (channelId) {
            refreshControl.onRefresh = this.onRefresh;
        }

        const data = this.getPostsWithDates();
        return (
            <FlatList
                ref='list'
                data={data}
                initialNumToRender={15}
                inverted={true}
                keyExtractor={this.keyExtractor}
                ListFooterComponent={this.renderChannelIntro}
                onEndReached={loadMore}
                onEndReachedThreshold={0}
                {...refreshControl}
                renderItem={this.renderItem}
                theme={theme}
                getItem={this.getItem}
                getItemCount={this.getItemCount}
                contentContainerStyle={styles.postListContent}
            />
        );
    }
}

const styles = StyleSheet.create({
    postListContent: {
        paddingTop: 5
    }
});
