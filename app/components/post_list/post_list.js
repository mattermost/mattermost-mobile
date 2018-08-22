// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    StyleSheet,
} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {ListTypes} from 'app/constants';
import Post from 'app/components/post';
import {START_OF_NEW_MESSAGES} from 'app/selectors/post_list';
import mattermostManaged from 'app/mattermost_managed';
import {makeExtraData} from 'app/utils/list_view';
import {changeOpacity} from 'app/utils/theme';
import {matchPermalink} from 'app/utils/url';

import DateHeader from './date_header';
import {isDateLine} from './date_header/utils';
import NewMessagesDivider from './new_messages_divider';
import withLayout from './with_layout';

const PostWithLayout = withLayout(Post);

const INITIAL_BATCH_TO_RENDER = 15;
const NEW_MESSAGES_HEIGHT = 28;
const DATE_HEADER_HEIGHT = 28;
const SCROLL_UP_MULTIPLIER = 3.5;

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
        extraData: PropTypes.any,
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
    };

    constructor(props) {
        super(props);

        this.newMessagesIndex = -1;
        this.makeExtraData = makeExtraData();
        this.itemMeasurements = {};

        this.contentOffsetY = 0;
        this.contentHeight = 0;

        this.state = {
            managedConfig: {},
            scrollToMessage: false,
            postListHeight: 0,
        };
    }

    componentWillMount() {
        this.listenerId = mattermostManaged.addEventListener('change', this.setManagedConfig);
    }

    componentDidMount() {
        EventEmitter.on('reset_channel', this.scrollToBottomOffset);
        this.setManagedConfig();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.postIds !== this.props.postIds) {
            this.newMessagesIndex = -1;
            this.isLoadingMoreUp = false;
        }
        if (this.props.channelId !== nextProps.channelId) {
            this.itemMeasurements = {};
            this.newMessageScrolledTo = false;
            this.scrollToBottomOffset();
        }
    }

    componentDidUpdate() {
        if ((this.props.measureCellLayout || this.props.isSearchResult) && this.state.scrollToMessage) {
            this.scrollListToMessageOffset();
        }

        if (this.props.deepLinkURL) {
            this.handleDeepLink(this.props.deepLinkURL);
            this.props.actions.setDeepLinkURL('');
        }
    }

    componentWillUnmount() {
        EventEmitter.off('reset_channel', this.scrollToBottomOffset);
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

    scrollToBottomOffset = () => {
        if (this.refs.list) {
            this.refs.list.scrollToOffset({offset: 0, animated: false});
        }
        this.setState({scrollToMessage: false});
    };

    getMeasurementOffset = (index) => {
        const orderedKeys = Object.keys(this.itemMeasurements).sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);

            if (numA > numB) {
                return 1;
            } else if (numA < numB) {
                return -1;
            }

            return 0;
        }).slice(0, index);

        return orderedKeys.map((i) => this.itemMeasurements[i]).reduce((a, b) => a + b, 0);
    };

    scrollListToMessageOffset = () => {
        const index = this.moreNewMessages ? this.props.postIds.length - 1 : this.newMessagesIndex;

        if (index !== -1) {
            let offset = this.getMeasurementOffset(index) + this.itemMeasurements[index];
            const windowHeight = this.state.postListHeight;

            if (offset < windowHeight) {
                return;
            }

            const upperBound = offset + windowHeight;
            offset = offset - ((upperBound - offset) / 2);
            if (this.refs.list) {
                if (!this.moreNewMessages) {
                    this.newMessageScrolledTo = true;
                }

                this.refs.list.scrollToOffset({offset, animated: false});
                this.newMessagesIndex = -1;
                this.moreNewMessages = false;
                this.setState({
                    scrollToMessage: false,
                });
            }
        }
    };

    setManagedConfig = async (config) => {
        let nextConfig = config;
        if (!nextConfig) {
            nextConfig = await mattermostManaged.getLocalConfig();
        }

        if (Object.keys(nextConfig).length) {
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

        if (channelId) {
            actions.refreshChannelWithRetry(channelId);
        }

        if (onRefresh) {
            onRefresh();
        }
    };

    measureItem = (index, height) => {
        this.itemMeasurements[index] = height;
        if (this.props.postIds.length === Object.values(this.itemMeasurements).length) {
            if (this.newMessagesIndex !== -1 && !this.newMessageScrolledTo) {
                this.setState({
                    scrollToMessage: true,
                });
            }
        }
    };

    renderItem = ({item, index}) => {
        if (item === START_OF_NEW_MESSAGES) {
            this.newMessagesIndex = index;

            // postIds includes a date item after the new message indicator so 2
            // needs to be added to the index for the length check to be correct.
            this.moreNewMessages = this.props.postIds.length === index + 2;

            this.itemMeasurements[index] = NEW_MESSAGES_HEIGHT;
            return (
                <NewMessagesDivider
                    index={index}
                    theme={this.props.theme}
                    moreMessages={this.moreNewMessages}
                />
            );
        } else if (isDateLine(item)) {
            this.itemMeasurements[index] = DATE_HEADER_HEIGHT;
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
        if (highlight) {
            this.newMessagesIndex = index;
        }

        return (
            <PostWithLayout
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
                onLayoutCalled={this.measureItem}
                shouldCallOnLayout={this.props.measureCellLayout && !this.newMessageScrolledTo}
            />
        );
    };

    onContentSizeChange = (contentWidth, contentHeight) => {
        this.contentHeight = contentHeight;
        this.props.onContentSizeChange(this.state.postListHeight, contentHeight);

        if (this.state.postListHeight && contentHeight < this.state.postListHeight && this.props.extraData) {
            // We still have less than 1 screen of posts loaded with more to get, so load more
            this.props.onLoadMoreUp();
        }
    };

    onLayout = (event) => {
        const {height} = event.nativeEvent.layout;
        this.setState({postListHeight: height});
    };

    onScroll = (event) => {
        const pageOffsetY = event.nativeEvent.contentOffset.y;
        if (pageOffsetY > 0) {
            this.contentHeight = event.nativeEvent.contentSize.height;
            const direction = (this.contentOffsetY < pageOffsetY) ?
                ListTypes.VISIBILITY_SCROLL_UP :
                ListTypes.VISIBILITY_SCROLL_DOWN;
            this.contentOffsetY = pageOffsetY;

            if (
                direction === ListTypes.VISIBILITY_SCROLL_UP &&
                (this.contentHeight - pageOffsetY) < (this.state.postListHeight * SCROLL_UP_MULTIPLIER)
            ) {
                this.props.onLoadMoreUp();
            } else if (
                direction === ListTypes.VISIBILITY_SCROLL_DOWN &&
                pageOffsetY < this.state.postListHeight
            ) {
                this.props.onLoadMoreDown();
            }
        }
    };

    render() {
        const {
            channelId,
            highlightPostId,
            postIds,
        } = this.props;

        const refreshControl = {
            refreshing: false,
        };

        if (channelId) {
            refreshControl.onRefresh = this.onRefresh;
        }

        return (
            <FlatList
                onContentSizeChange={this.onContentSizeChange}
                onLayout={this.onLayout}
                ref='list'
                data={postIds}
                extraData={this.makeExtraData(channelId, highlightPostId, this.props.extraData)}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                inverted={true}
                keyExtractor={this.keyExtractor}
                ListFooterComponent={this.props.renderFooter}
                removeClippedSubviews={true}
                {...refreshControl}
                renderItem={this.renderItem}
                contentContainerStyle={styles.postListContent}
                onScroll={this.onScroll}
                scrollEventThrottle={60}
            />
        );
    }
}

const styles = StyleSheet.create({
    postListContent: {
        paddingTop: 5,
    },
});
