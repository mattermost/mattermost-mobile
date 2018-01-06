// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    Platform,
    StyleSheet,
    FlatList
} from 'react-native';

import ChannelIntro from 'app/components/channel_intro';
import Post from 'app/components/post';
import {DATE_LINE, START_OF_NEW_MESSAGES} from 'app/selectors/post_list';
import mattermostManaged from 'app/mattermost_managed';
import {makeExtraData} from 'app/utils/list_view';

import DateHeader from './date_header';
import LoadMorePosts from './load_more_posts';
import NewMessagesDivider from './new_messages_divider';

export default class PostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            refreshChannelWithRetry: PropTypes.func.isRequired
        }).isRequired,
        channelId: PropTypes.string,
        currentUserId: PropTypes.string,
        highlightPostId: PropTypes.string,
        indicateNewMessages: PropTypes.bool,
        initialBatchToRender: PropTypes.number.isRequired,
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

    newMessagesIndex = -1;
    scrollToMessageTries = 0;
    makeExtraData = makeExtraData();

    state = {
        managedConfig: {}
    };

    componentWillMount() {
        this.listenerId = mattermostManaged.addEventListener('change', this.setManagedConfig);
    }

    componentDidMount() {
        this.setManagedConfig();
        this.scrollList();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.postIds !== this.props.postIds) {
            this.newMessagesIndex = -1;
        }
    }

    componentDidUpdate(prevProps) {
        const initialPosts = !prevProps.postIds.length && prevProps.postIds !== this.props.postIds;
        if ((prevProps.channelId !== this.props.channelId || initialPosts || this.props.isSearchResult) && this.refs.list) {
            this.moreNewMessages = false;
            this.scrollToMessageTries = 0;
            this.scrollList();
        } else if (prevProps.channelId === this.props.channelId && this.moreNewMessages) {
            this.scrollList();
        }
    }

    componentWillUnmount() {
        mattermostManaged.removeEventListener(this.listenerId);
    }

    scrollList = () => {
        InteractionManager.runAfterInteractions(() => {
            if (this.props.postIds.length && this.newMessagesIndex !== -1 && !this.moreNewMessages) {
                if (this.refs.list) {
                    this.refs.list.scrollToIndex({
                        index: this.newMessagesIndex,
                        viewPosition: 1,
                        viewOffset: -10,
                        animated: true
                    });
                    this.newMessagesIndex = -1;
                }
            } else if (this.refs.list && this.moreNewMessages) {
                this.refs.list.scrollToIndex({
                    index: this.props.postIds.length - 1,
                    viewPosition: 1,
                    viewOffset: -10,
                    animated: true
                });
                this.moreNewMessages = false;
            } else if (this.refs.list) {
                this.refs.list.scrollToOffset({y: 0, animated: false});
            }
        });
    };

    scrollListFailed = ({index}) => {
        if (this.scrollToMessageTries < 3) {
            this.scrollToMessageTries++;
            setTimeout(() => {
                this.newMessagesIndex = index;
                this.scrollList();
            }, 300);
        }
    }

    setManagedConfig = async (config) => {
        let nextConfig = config;
        if (!nextConfig) {
            nextConfig = await mattermostManaged.getLocalConfig();
        }

        this.setState({
            managedConfig: nextConfig
        });
    };

    keyExtractor = (item) => {
        // All keys are strings (either post IDs or special keys)
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
        if (item === START_OF_NEW_MESSAGES) {
            this.newMessagesIndex = index;
            this.moreNewMessages = this.props.postIds.length === index + 2;
            return (
                <NewMessagesDivider
                    theme={this.props.theme}
                    moreMessages={this.moreNewMessages}
                />
            );
        } else if (item.indexOf(DATE_LINE) === 0) {
            const date = item.substring(DATE_LINE.length);
            return this.renderDateHeader(new Date(date));
        }

        const postId = item;

        // Remember that the list is rendered with item 0 at the bottom so the "previous" post
        // comes after this one in the list
        const previousPostId = index < this.props.postIds.length - 1 ? this.props.postIds[index + 1] : null;
        const nextPostId = index > 0 ? this.props.postIds[index - 1] : null;

        return this.renderPost(postId, previousPostId, nextPostId, index);
    };

    renderDateHeader = (date) => {
        return (
            <DateHeader date={date}/>
        );
    };

    renderPost = (postId, previousPostId, nextPostId, index) => {
        const {
            highlightPostId,
            isSearchResult,
            navigator,
            onPostPress,
            renderReplies,
            shouldRenderReplyButton
        } = this.props;
        const {managedConfig} = this.state;

        const highlight = highlightPostId === postId;
        if (highlight) {
            this.newMessagesIndex = index;
        }

        return (
            <Post
                postId={postId}
                previousPostId={previousPostId}
                nextPostId={nextPostId}
                highlight={highlight}
                renderReplies={renderReplies}
                isSearchResult={isSearchResult}
                shouldRenderReplyButton={shouldRenderReplyButton}
                onPress={onPostPress}
                navigator={navigator}
                managedConfig={managedConfig}
            />
        );
    };

    renderFooter = () => {
        if (!this.props.channelId) {
            return null;
        }

        if (this.props.showLoadMore) {
            return (
                <LoadMorePosts
                    channelId={this.props.channelId}
                    theme={this.props.theme}
                />
            );
        }

        return (
            <ChannelIntro
                channelId={this.props.channelId}
                navigator={this.props.navigator}
            />
        );
    };

    render() {
        const {
            channelId,
            highlightPostId,
            initialBatchToRender,
            loadMore,
            postIds
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
                extraData={this.makeExtraData(channelId, highlightPostId)}
                initialNumToRender={initialBatchToRender}
                maxToRenderPerBatch={initialBatchToRender + 1}
                inverted={true}
                keyExtractor={this.keyExtractor}
                ListFooterComponent={this.renderFooter}
                onEndReached={loadMore}
                onEndReachedThreshold={Platform.OS === 'ios' ? 0 : 1}
                onScrollToIndexFailed={this.scrollListFailed}
                {...refreshControl}
                renderItem={this.renderItem}
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
