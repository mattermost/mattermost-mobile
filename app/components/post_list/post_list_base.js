// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import * as PostListUtils from 'mattermost-redux/utils/post_list';

import CombinedUserActivityPost from 'app/components/combined_user_activity_post';
import Post from 'app/components/post';
import {DeepLinkTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import {changeOpacity} from 'app/utils/theme';
import {matchDeepLink} from 'app/utils/url';

import DateHeader from './date_header';
import NewMessagesDivider from './new_messages_divider';

export default class PostListBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleSelectChannelByName: PropTypes.func.isRequired,
            loadChannelsByTeamName: PropTypes.func.isRequired,
            refreshChannelWithRetry: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
            setDeepLinkURL: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string,
        deepLinkURL: PropTypes.string,
        extraData: PropTypes.any,
        highlightPinnedOrFlagged: PropTypes.bool,
        highlightPostId: PropTypes.string,
        initialIndex: PropTypes.number,
        isSearchResult: PropTypes.bool,
        lastViewedAt: PropTypes.number, // Used by container // eslint-disable-line no-unused-prop-types
        navigator: PropTypes.object,
        onLoadMoreUp: PropTypes.func,
        onHashtagPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        onPostPress: PropTypes.func,
        onRefresh: PropTypes.func,
        postIds: PropTypes.array.isRequired,
        refreshing: PropTypes.bool,
        renderFooter: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
        renderReplies: PropTypes.bool,
        serverURL: PropTypes.string.isRequired,
        shouldRenderReplyButton: PropTypes.bool,
        siteURL: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        location: PropTypes.string,
    };

    static defaultProps = {
        onLoadMoreUp: () => true,
        renderFooter: () => null,
        refreshing: false,
        serverURL: '',
        siteURL: '',
    };

    componentWillMount() {
        this.listenerId = mattermostManaged.addEventListener('managedConfigDidChange', this.setManagedConfig);
    }

    componentDidMount() {
        this.mounted = true;
        this.setManagedConfig();
    }

    componentDidUpdate() {
        if (this.props.deepLinkURL) {
            this.handleDeepLink(this.props.deepLinkURL);
            this.props.actions.setDeepLinkURL('');
        }
    }

    componentWillUnmount() {
        this.mounted = false;
        mattermostManaged.removeEventListener(this.listenerId);
    }

    handleClosePermalink = () => {
        const {actions} = this.props;
        actions.selectFocusedPostId('');
        this.showingPermalink = false;
    };

    handleDeepLink = (url) => {
        const {serverURL, siteURL} = this.props;

        const match = matchDeepLink(url, serverURL, siteURL);
        if (match) {
            if (match.type === DeepLinkTypes.CHANNEL) {
                this.props.actions.handleSelectChannelByName(match.channelName, match.teamName);
            } else if (match.type === DeepLinkTypes.PERMALINK) {
                this.handlePermalinkPress(match.postId, match.teamName);
            }
        }
    };

    handleRefresh = () => {
        const {
            actions,
            channelId,
            onRefresh,
        } = this.props;

        if (channelId) {
            actions.refreshChannelWithRetry(channelId);
        }

        if (onRefresh) {
            onRefresh();
        }
    };

    handlePermalinkPress = (postId, teamName) => {
        const {actions, onPermalinkPress} = this.props;

        if (onPermalinkPress) {
            onPermalinkPress(postId, true);
        } else {
            actions.loadChannelsByTeamName(teamName);
            this.showPermalinkView(postId);
        }
    };

    keyExtractor = (item) => {
        // All keys are strings (either post IDs or special keys)
        return item;
    };

    renderItem = ({item, index}) => {
        if (PostListUtils.isStartOfNewMessages(item)) {
            // postIds includes a date item after the new message indicator so 2
            // needs to be added to the index for the length check to be correct.
            const moreNewMessages = this.props.postIds.length === index + 2;

            return (
                <NewMessagesDivider
                    index={index}
                    theme={this.props.theme}
                    moreMessages={moreNewMessages}
                />
            );
        } else if (PostListUtils.isDateLine(item)) {
            return (
                <DateHeader
                    date={PostListUtils.getDateForDateLine(item)}
                    index={index}
                />
            );
        }

        // Remember that the list is rendered with item 0 at the bottom so the "previous" post
        // comes after this one in the list
        const previousPostId = index < this.props.postIds.length - 1 ? this.props.postIds[index + 1] : null;
        const nextPostId = index > 0 ? this.props.postIds[index - 1] : null;

        const postProps = {
            previousPostId,
            nextPostId,
            highlightPinnedOrFlagged: this.props.highlightPinnedOrFlagged,
            isSearchResult: this.props.isSearchResult,
            location: this.props.location,
            managedConfig: this.state.managedConfig,
            navigator: this.props.navigator,
            onHashtagPress: this.props.onHashtagPress,
            onPermalinkPress: this.handlePermalinkPress,
            onPostPress: this.props.onPostPress,
            renderReplies: this.props.renderReplies,
            shouldRenderReplyButton: this.props.shouldRenderReplyButton,
        };

        if (PostListUtils.isCombinedUserActivityPost(item)) {
            return (
                <CombinedUserActivityPost
                    combinedId={item}
                    {...postProps}
                />
            );
        }

        const postId = item;

        return (
            <Post
                postId={postId}
                highlight={this.props.highlightPostId === postId}
                {...postProps}
            />
        );
    };

    setManagedConfig = async (config) => {
        let nextConfig = config;
        if (!nextConfig) {
            nextConfig = await mattermostManaged.getLocalConfig();
        }

        if (this.mounted) {
            this.setState({
                managedConfig: nextConfig,
            });
        }
    };

    showPermalinkView = (postId) => {
        const {actions, navigator} = this.props;

        actions.selectFocusedPostId(postId);

        if (!this.showingPermalink) {
            const options = {
                screen: 'Permalink',
                animationType: 'none',
                backButtonTitle: '',
                overrideBackPress: true,
                navigatorStyle: {
                    navBarHidden: true,
                    screenBackgroundColor: changeOpacity('#000', 0.2),
                    modalPresentationStyle: 'overCurrentContext',
                },
                passProps: {
                    isPermalink: true,
                    onClose: this.handleClosePermalink,
                },
            };

            this.showingPermalink = true;
            navigator.showModal(options);
        }
    };
}

