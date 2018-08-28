// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import Post from 'app/components/post';
import {START_OF_NEW_MESSAGES} from 'app/selectors/post_list';
import mattermostManaged from 'app/mattermost_managed';
import {changeOpacity} from 'app/utils/theme';
import {matchPermalink} from 'app/utils/url';

import DateHeader from './date_header';
import {isDateLine} from './date_header/utils';
import NewMessagesDivider from './new_messages_divider';

export default class PostListBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadChannelsByTeamName: PropTypes.func.isRequired,
            refreshChannelWithRetry: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
            setDeepLinkURL: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string,
        deepLinkURL: PropTypes.string,
        extraData: PropTypes.any,
        highlightPostId: PropTypes.string,
        initialIndex: PropTypes.number,
        isSearchResult: PropTypes.bool,
        lastViewedAt: PropTypes.number, // Used by container // eslint-disable-line no-unused-prop-types
        navigator: PropTypes.object,
        onLoadMoreDown: PropTypes.func,
        onLoadMoreUp: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        onPostPress: PropTypes.func,
        onRefresh: PropTypes.func,
        postIds: PropTypes.array.isRequired,
        renderFooter: PropTypes.func,
        renderReplies: PropTypes.bool,
        serverURL: PropTypes.string.isRequired,
        shouldRenderReplyButton: PropTypes.bool,
        siteURL: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        onLoadMoreDown: () => true,
        onLoadMoreUp: () => true,
        renderFooter: () => null,
    };

    componentWillMount() {
        this.listenerId = mattermostManaged.addEventListener('change', this.setManagedConfig);
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

        const match = matchPermalink(url, serverURL) || matchPermalink(url, siteURL);

        if (match) {
            const teamName = match[1];
            const postId = match[2];
            this.handlePermalinkPress(postId, teamName);
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
        if (item === START_OF_NEW_MESSAGES) {
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
        } else if (isDateLine(item)) {
            return (
                <DateHeader
                    dateLineString={item}
                    index={index}
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

    renderPost = (postId, previousPostId, nextPostId) => {
        const {
            highlightPostId,
            isSearchResult,
            navigator,
            onPostPress,
            renderReplies,
            shouldRenderReplyButton,
        } = this.props;
        const {managedConfig} = this.state;

        const highlight = highlightPostId === postId;
        return (
            <Post
                postId={postId}
                previousPostId={previousPostId}
                nextPostId={nextPostId}
                onPermalinkPress={this.handlePermalinkPress}
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
                    onPermalinkPress: this.handlePermalinkPress,
                },
            };

            this.showingPermalink = true;
            navigator.showModal(options);
        }
    };
}

