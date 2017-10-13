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

import ChannelIntro from 'app/components/channel_intro';
import Post from 'app/components/post';
import DateHeader from './date_header';
import LoadMorePosts from './load_more_posts';
import NewMessagesDivider from './new_messages_divider';

export const START_OF_NEW_MESSAGES = 'start-of-new-messages';

export default class PostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            refreshChannelWithRetry: PropTypes.func.isRequired
        }).isRequired,
        channelId: PropTypes.string,
        currentUserId: PropTypes.string,
        indicateNewMessages: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        lastViewedAt: PropTypes.number, // Used by container // eslint-disable-line no-unused-prop-types
        loadMore: PropTypes.func,
        navigator: PropTypes.object,
        onPostPress: PropTypes.func,
        onRefresh: PropTypes.func,
        postIds: PropTypes.array.isRequired,
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

    getItem = (data, index) => data[index];

    getItemCount = (data) => data.length;

    keyExtractor = (item) => {
        if (item instanceof Date) {
            return item.getTime();
        }

        return item;
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

    renderItem = ({item, index}) => {
        if (item instanceof Date) {
            return this.renderDateHeader(item);
        } else if (item === General.START_OF_NEW_MESSAGES) {
            return (
                <NewMessagesDivider
                    theme={this.props.theme}
                />
            );
        }

        const postId = item;

        // Remember that the list is rendered with item 0 at the bottom so the "previous" post
        // comes after this one in the list
        const previousPostId = index < this.props.postIds.length - 1 ? this.props.postIds[index + 1] : null;
        const nextPostId = index > 0 ? this.props.postIds[index - 1] : null;

        return this.renderPost(postId, previousPostId, nextPostId);
    };

    renderDateHeader = (date) => {
        return (
            <DateHeader
                theme={this.props.theme}
                date={date}
            />
        );
    };

    renderPost = (postId, previousPostId, nextPostId) => {
        const {
            isSearchResult,
            navigator,
            onPostPress,
            renderReplies,
            shouldRenderReplyButton
        } = this.props;

        return (
            <Post
                postId={postId}
                previousPostId={previousPostId}
                nextPostId={nextPostId}
                renderReplies={renderReplies}
                isSearchResult={isSearchResult}
                shouldRenderReplyButton={shouldRenderReplyButton}
                onPress={onPostPress}
                navigator={navigator}
            />
        );
    };

    renderFooter = () => {
        if (this.props.showLoadMore) {
            return <LoadMorePosts theme={this.props.theme}/>;
        } else if (this.props.channelId) {
            // FIXME: Only show the channel intro when we are at the very start of the channel
            return (
                <View>
                    <ChannelIntro navigator={this.props.navigator}/>
                </View>
            );
        }

        return null;
    };

    render() {
        const {
            channelId,
            loadMore,
            postIds,
            theme
        } = this.props;

        const refreshControl = {
            refreshing: false
        };

        if (channelId) {
            refreshControl.onRefresh = this.onRefresh;
        }

        return (
            <FlatList
                ref='list'
                data={postIds}
                initialNumToRender={15}
                inverted={true}
                keyExtractor={this.keyExtractor}
                ListFooterComponent={this.renderFooter}
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
