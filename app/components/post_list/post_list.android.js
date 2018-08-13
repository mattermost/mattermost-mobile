// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {StyleSheet} from 'react-native';
import RecyclerViewList, {DataSource, RecyclerRefreshControl} from 'react-native-recyclerview-list';

import {ListTypes} from 'app/constants';
import Post from 'app/components/post';
import {START_OF_NEW_MESSAGES} from 'app/selectors/post_list';
import mattermostManaged from 'app/mattermost_managed';
import {changeOpacity} from 'app/utils/theme';
import {matchPermalink} from 'app/utils/url';

import DateHeader from './date_header';
import {isDateLine} from './date_header/utils';
import NewMessagesDivider from './new_messages_divider';

export default class PostList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadChannelsByTeamName: PropTypes.func.isRequired,
            refreshChannelWithRetry: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
            setDeepLinkURL: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string,
        currentUserId: PropTypes.string,
        deepLinkURL: PropTypes.string,
        deviceHeight: PropTypes.number.isRequired,
        highlightPostId: PropTypes.string,
        indicateNewMessages: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        lastViewedAt: PropTypes.number, // Used by container // eslint-disable-line no-unused-prop-types
        measureCellLayout: PropTypes.bool,
        navigator: PropTypes.object,
        onContentSizeChange: PropTypes.func,
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
        onContentSizeChange: () => true,
        renderFooter: () => null,
    };

    constructor(props) {
        super(props);

        this.contentOffsetY = 0;
        this.pageOffsetY = 0;
        this.contentHeight = 0;
        this.state = {
            refreshing: false,
            managedConfig: {},
            dataSource: new DataSource(props.postIds, this.keyExtractor),
        };
    }

    componentWillMount() {
        this.listenerId = mattermostManaged.addEventListener('change', this.setManagedConfig);
    }

    componentDidMount() {
        this.mounted = true;
        this.setManagedConfig();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.postIds !== this.props.postIds && this.mounted) {
            // TODO: Smart update of the DataSource?
            this.setState({
                dataSource: new DataSource(nextProps.postIds, this.keyExtractor),
            });
        }
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

    handlePermalinkPress = (postId, teamName) => {
        const {actions, onPermalinkPress} = this.props;

        if (onPermalinkPress) {
            onPermalinkPress(postId, true);
        } else {
            actions.loadChannelsByTeamName(teamName);
            this.showPermalinkView(postId);
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

    keyExtractor = (item) => {
        // All keys are strings (either post IDs or special keys)
        return item;
    };

    onRefresh = () => {
        const {
            actions,
            channelId,
            onRefresh,
        } = this.props;

        if (channelId && this.mounted) {
            this.setState({refreshing: true});
            actions.refreshChannelWithRetry(channelId).then(() => {
                this.setState({refreshing: false});
            });
        }

        if (onRefresh) {
            onRefresh();
        }
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

        return this.renderPost(postId, previousPostId, nextPostId, index);
    };

    renderPost = (postId, previousPostId, nextPostId, index) => {
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
                highlight={highlight}
                index={index}
                renderReplies={renderReplies}
                isSearchResult={isSearchResult}
                shouldRenderReplyButton={shouldRenderReplyButton}
                onPermalinkPress={this.handlePermalinkPress}
                onPress={onPostPress}
                navigator={navigator}
                managedConfig={managedConfig}
            />
        );
    };

    onInitialLayout = (layoutHeight, contentWidth, contentHeight) => {
        this.contentHeight = contentHeight;
        this.props.onContentSizeChange(layoutHeight, contentHeight);

        if (layoutHeight && contentHeight < layoutHeight) {
            // We still have less than 1 screen of posts loaded with more to get, so load more
            this.props.onLoadMoreUp();
        }
    };

    onScroll = (event) => {
        const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;

        if (!this.postListHeight) {
            this.onInitialLayout(layoutMeasurement.height, contentSize.width, contentSize.height);
        }

        this.postListHeight = layoutMeasurement.height;

        if (contentOffset.y > 0) {
            this.pageOffsetY = contentOffset.y;
            this.contentHeight = contentSize.height;
            const direction = (this.contentOffsetY < this.pageOffsetY) ?
                ListTypes.VISIBILITY_SCROLL_DOWN :
                ListTypes.VISIBILITY_SCROLL_UP;
            this.contentOffsetY = contentOffset.y;
            const doubleHeight = Math.round(this.postListHeight) * 2;

            switch (direction) {
            case ListTypes.VISIBILITY_SCROLL_DOWN:
                if ((Math.round(this.contentHeight - this.pageOffsetY) < doubleHeight)) {
                    this.props.onLoadMoreDown();
                }
                break;
            case ListTypes.VISIBILITY_SCROLL_UP:
                if (Math.round(this.pageOffsetY) < doubleHeight) {
                    this.props.onLoadMoreUp();
                }
                break;
            }
        }
    };

    render() {
        const {
            channelId,
            highlightPostId,
            postIds,
        } = this.props;

        const otherProps = {};
        if (postIds.length) {
            otherProps.ListFooterComponent = this.props.renderFooter();
        } else {
            otherProps.ListEmptyComponent = this.props.renderFooter();
        }

        const hasPostsKey = postIds.length ? 'true' : 'false';
        let index = postIds.indexOf(START_OF_NEW_MESSAGES);
        if (highlightPostId) {
            index = postIds.indexOf(highlightPostId);
        }

        return (
            <RecyclerRefreshControl
                key={`recyclerFor-${channelId}-${hasPostsKey}`}
                colors={['red', 'blue']}
                direction='bottom'
                enabled={Boolean(channelId)}
                onRefresh={this.onRefresh}
                refreshing={this.state.refreshing}
                style={styles.flex}
            >
                <RecyclerViewList
                    key={`${channelId}-${hasPostsKey}`}
                    ref={'list'}
                    style={{flex: 1}}
                    dataSource={this.state.dataSource}
                    renderItem={this.renderItem}
                    initialScrollIndex={index}
                    initialScrollPosition={RecyclerViewList.Constants.ScrollPosition.BOTTOM}
                    initialScrollOffset={index > -1 ? -50 : 0}
                    inverted={true}
                    onScroll={this.onScroll}
                    onContentSizeChange={this.onContentSizeChange}
                    {...otherProps}
                />
            </RecyclerRefreshControl>
        );
    }
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    postListContent: {
        paddingTop: 5,
    },
});
