// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Keyboard,
    FlatList,
    StyleSheet,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {isDateLine, getDateForDateLine} from '@redux/utils/post_list';

import ChannelLoader from 'app/components/channel_loader';
import DateHeader from 'app/components/post_list/date_header';
import FailedNetworkAction from 'app/components/failed_network_action';
import NoResults from 'app/components/no_results';
import PostSeparator from 'app/components/post_separator';
import StatusBar from 'app/components/status_bar';
import mattermostManaged from 'app/mattermost_managed';
import SearchResultPost from 'app/screens/search/search_result_post';
import {changeOpacity} from 'app/utils/theme';
import {
    goToScreen,
    showModalOverCurrentContext,
    showSearchModal,
    dismissModal,
} from 'app/actions/navigation';

import noResultsImage from 'assets/images/no_results/pin.png';

export default class PinnedPosts extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearSearch: PropTypes.func.isRequired,
            loadChannelsByTeamName: PropTypes.func.isRequired,
            loadThreadIfNecessary: PropTypes.func.isRequired,
            getPinnedPosts: PropTypes.func.isRequired,
            selectFocusedPostId: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
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
        actions.loadThreadIfNecessary(rootId);
        actions.selectPost(rootId);
        goToScreen(screen, title, passProps);
    };

    handleClosePermalink = () => {
        const {actions} = this.props;
        actions.selectFocusedPostId('');
        this.showingPermalink = false;
    };

    handlePermalinkPress = (postId, teamName) => {
        this.props.actions.loadChannelsByTeamName(teamName);
        this.showPermalinkView(postId, true);
    };

    handleHashtagPress = async (hashtag) => {
        dismissModal();
        showSearchModal('#' + hashtag);
    };

    keyExtractor = (item) => item;

    previewPost = (post) => {
        Keyboard.dismiss();

        this.showPermalinkView(post.id, false);
    };

    renderEmpty = () => {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;

        return (
            <NoResults
                description={formatMessage({
                    id: 'mobile.pinned_posts.empty_description',
                    defaultMessage: 'Pin important items by holding down on any message and selecting "Pin to Channel".',
                })}
                image={noResultsImage}
                title={formatMessage({id: 'mobile.pinned_posts.empty_title', defaultMessage: 'No Pinned Posts'})}
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

    showPermalinkView = (postId, isPermalink) => {
        const {actions} = this.props;

        actions.selectFocusedPostId(postId);

        if (!this.showingPermalink) {
            const screen = 'Permalink';
            const passProps = {
                isPermalink,
                onClose: this.handleClosePermalink,
            };
            const options = {
                layout: {
                    backgroundColor: changeOpacity('#000', 0.2),
                },
            };

            this.showingPermalink = true;
            showModalOverCurrentContext(screen, passProps, options);
        }
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
                />
            );
        } else {
            component = this.renderEmpty();
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                {component}
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
});
