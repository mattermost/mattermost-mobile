// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    DeviceEventEmitter,
    Keyboard,
    FlatList,
    StyleSheet,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {dismissModal, goToScreen, showSearchModal} from '@actions/navigation';
import ChannelLoader from '@components/channel_loader';
import DateHeader from '@components/post_list/date_header';
import FailedNetworkAction from '@components/failed_network_action';
import NoResults from '@components/no_results';
import PostSeparator from '@components/post_separator';
import StatusBar from '@components/status_bar';
import {isDateLine, getDateForDateLine} from '@mm-redux/utils/post_list';
import SearchResultPost from '@screens/search/search_result_post';

import mattermostManaged from 'app/mattermost_managed';

export default class PinnedPosts extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearSearch: PropTypes.func.isRequired,
            getPostThread: PropTypes.func.isRequired,
            getPinnedPosts: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
            showPermalink: PropTypes.func.isRequired,
        }).isRequired,
        currentChannelId: PropTypes.string.isRequired,
        postIds: PropTypes.array,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            didFail: false,
            isLoading: false,
        };
    }

    static defaultProps = {
        postIds: [],
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);

        const {actions} = this.props;
        actions.clearSearch();
        this.getPinnedPosts();
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === 'close-settings') {
            dismissModal();
        }
    }

    getPinnedPosts = async () => {
        const {actions, currentChannelId} = this.props;

        this.setState({isLoading: true});
        const {error} = await actions.getPinnedPosts(currentChannelId);

        this.setState({
            isLoading: false,
            didFail: Boolean(error),
        });
    }

    setListRef = (ref) => {
        this.listRef = ref;
    }

    goToThread = (post) => {
        const {actions} = this.props;
        const channelId = post.channel_id;
        const rootId = (post.root_id || post.id);
        const screen = 'Thread';
        const title = '';
        const passProps = {
            channelId,
            rootId,
        };
        Keyboard.dismiss();
        actions.getPostThread(rootId);
        actions.selectPost(rootId);
        goToScreen(screen, title, passProps);
    };

    handlePermalinkPress = (postId, teamName) => {
        this.props.actions.showPermalink(this.context.intl, teamName, postId);
    };

    handleHashtagPress = async (hashtag) => {
        dismissModal();
        showSearchModal('#' + hashtag);
    };

    keyExtractor = (item) => item;

    onViewableItemsChanged = ({viewableItems}) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc, {item, isViewable}) => {
            if (isViewable) {
                acc[item] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit('scrolled', viewableItemsMap);
    };

    previewPost = (post) => {
        this.props.actions.showPermalink(this.context.intl, '', post.id, false);
    };

    renderEmpty = () => {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;

        return (
            <NoResults
                description={formatMessage({
                    id: 'mobile.pinned_posts.empty_description',
                    defaultMessage: 'Pin important messages which are visible to the whole channel. Long press on a message and choose Pin to Channel to save it here.',
                })}
                iconName='pin-outline'
                title={formatMessage({id: 'mobile.pinned_posts.empty_title', defaultMessage: 'No Pinned messages yet'})}
                theme={theme}
            />
        );
    };

    renderPost = ({item, index}) => {
        const {postIds, theme} = this.props;
        if (isDateLine(item)) {
            return (
                <DateHeader
                    date={getDateForDateLine(item)}
                    index={index}
                />
            );
        }

        let separator;
        const nextPost = postIds[index + 1];
        if (nextPost && !isDateLine(nextPost)) {
            separator = <PostSeparator theme={theme}/>;
        }

        return (
            <React.Fragment>
                <SearchResultPost
                    postId={item}
                    previewPost={this.previewPost}
                    highlightPinnedOrFlagged={true}
                    goToThread={this.goToThread}
                    onHashtagPress={this.handleHashtagPress}
                    onPermalinkPress={this.handlePermalinkPress}
                    managedConfig={mattermostManaged.getCachedConfig()}
                    showFullDate={false}
                    skipFlaggedHeader={false}
                    skipPinnedHeader={true}
                />
                {separator}
            </React.Fragment>
        );
    };

    retry = () => {
        this.getPinnedPosts();
    };

    render() {
        const {postIds, theme} = this.props;
        const {didFail, isLoading} = this.state;

        let component;
        if (didFail) {
            component = (
                <FailedNetworkAction
                    onRetry={this.retry}
                    theme={theme}
                />
            );
        } else if (isLoading) {
            component = (
                <ChannelLoader channelIsLoading={true}/>
            );
        } else if (postIds.length) {
            component = (
                <FlatList
                    ref={this.setListRef}
                    contentContainerStyle={style.sectionList}
                    data={postIds}
                    keyExtractor={this.keyExtractor}
                    keyboardShouldPersistTaps='always'
                    keyboardDismissMode='interactive'
                    renderItem={this.renderPost}
                    onViewableItemsChanged={this.onViewableItemsChanged}
                />
            );
        } else {
            component = this.renderEmpty();
        }

        return (
            <SafeAreaView
                testID='pinned_messages.screen'
                edges={['bottom', 'left', 'right']}
                style={style.container}
            >
                <StatusBar/>
                {component}
            </SafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
});
