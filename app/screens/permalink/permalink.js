// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import * as Animatable from 'react-native-animatable';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';

import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getLastPostIndex} from 'mattermost-redux/utils/post_list';

import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import PostList from 'app/components/post_list';
import PostListRetry from 'app/components/post_list_retry';
import SafeAreaView from 'app/components/safe_area_view';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

Animatable.initializeRegistryWithDefinitions({
    growOut: {
        from: {
            opacity: 1,
            scale: 1,
        },
        0.5: {
            opacity: 1,
            scale: 3,
        },
        to: {
            opacity: 0,
            scale: 5,
        },
    },
});

export default class Permalink extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getPostsAround: PropTypes.func.isRequired,
            getPostThread: PropTypes.func.isRequired,
            getChannel: PropTypes.func.isRequired,
            handleSelectChannel: PropTypes.func.isRequired,
            handleTeamChange: PropTypes.func.isRequired,
            joinChannel: PropTypes.func.isRequired,
            loadThreadIfNecessary: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string,
        channelIsArchived: PropTypes.bool,
        channelName: PropTypes.string,
        channelTeamId: PropTypes.string,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        focusedPostId: PropTypes.string.isRequired,
        isPermalink: PropTypes.bool,
        myMembers: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        onClose: PropTypes.func,
        onPress: PropTypes.func,
        postIds: PropTypes.array,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        onPress: () => true,
        postIds: [],
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const newState = {};
        if (nextProps.focusedPostId !== prevState.focusedPostIdState) {
            newState.focusedPostIdState = nextProps.focusedPostId;
        }

        if (nextProps.channelId && nextProps.channelId !== prevState.channelIdState) {
            newState.channelIdState = nextProps.channelId;
        }

        if (nextProps.channelName && nextProps.channelName !== prevState.channelNameState) {
            newState.channelNameState = nextProps.channelName;
        }

        if (nextProps.postIds && nextProps.postIds.length > 0 && nextProps.postIds !== prevState.postIdsState) {
            newState.postIdsState = nextProps.postIds;
        }

        if (nextProps.focusedPostId !== prevState.focusedPostIdState) {
            let loading = true;
            if (nextProps.postIds && nextProps.postIds.length >= 10) {
                loading = false;
            }

            newState.loading = loading;
        }

        if (Object.keys(newState).length === 0) {
            return null;
        }

        return newState;
    }

    constructor(props) {
        super(props);

        const {
            postIds,
            channelId,
            channelName,
            focusedPostId,
        } = props;
        let loading = true;

        if (postIds && postIds.length >= 10) {
            loading = false;
        }

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);

        this.state = {
            title: channelName,
            loading,
            error: '',
            retry: false,
            channelIdState: channelId,
            channelNameState: channelName,
            focusedPostIdState: focusedPostId,
            postIdsState: postIds,
        };
    }

    componentDidMount() {
        this.mounted = true;

        if (this.state.loading) {
            this.loadPosts(this.props);
        }
    }

    componentDidUpdate() {
        if (this.state.loading) {
            this.loadPosts(this.props);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    goToThread = preventDoubleTap((post) => {
        const {actions, navigator, theme} = this.props;
        const channelId = post.channel_id;
        const rootId = (post.root_id || post.id);

        actions.loadThreadIfNecessary(rootId);
        actions.selectPost(rootId);

        const options = {
            screen: 'Thread',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                channelId,
                rootId,
            },
        };

        navigator.push(options);
    });

    handleClose = () => {
        const {actions, navigator, onClose} = this.props;
        if (this.refs.view) {
            this.mounted = false;
            this.refs.view.zoomOut().then(() => {
                actions.selectPost('');
                navigator.dismissModal({animationType: 'none'});

                if (onClose) {
                    onClose();
                }
            });
        }
    };

    handleHashtagPress = () => {
        // Do nothing because we're already in a modal
    };

    handlePermalinkPress = () => {
        // Do nothing because we're already in permalink view for a different post
    };

    handlePress = () => {
        const {channelIdState, channelNameState} = this.state;

        if (this.refs.view) {
            this.refs.view.growOut().then(() => {
                this.jumpToChannel(channelIdState, channelNameState);
            });
        }
    };

    jumpToChannel = (channelId, channelDisplayName) => {
        if (channelId) {
            const {actions, channelTeamId, currentTeamId, navigator, onClose, theme} = this.props;
            const currentChannelId = this.props.channelId;
            const {
                handleSelectChannel,
                handleTeamChange,
                setChannelLoading,
                setChannelDisplayName,
            } = actions;

            actions.selectPost('');

            if (channelId === currentChannelId) {
                EventEmitter.emit('reset_channel');
            } else {
                navigator.resetTo({
                    screen: 'Channel',
                    animated: true,
                    animationType: 'fade',
                    navigatorStyle: {
                        navBarHidden: true,
                        statusBarHidden: false,
                        statusBarHideWithNavBar: false,
                        screenBackgroundColor: theme.centerChannelBg,
                    },
                    passProps: {
                        disableTermsModal: true,
                    },
                });
            }

            navigator.dismissAllModals({animationType: 'slide-down'});

            if (onClose) {
                onClose();
            }

            if (channelTeamId && currentTeamId !== channelTeamId) {
                handleTeamChange(channelTeamId);
            }

            setChannelLoading(channelId !== currentChannelId);
            setChannelDisplayName(channelDisplayName);
            handleSelectChannel(channelId);
        }
    };

    loadPosts = async (props) => {
        const {intl} = this.context;
        const {actions, channelId, currentUserId, focusedPostId, isPermalink, postIds} = props;
        const {formatMessage} = intl;
        let focusChannelId = channelId;

        const post = await actions.getPostThread(focusedPostId, false);
        if (post.error && (!postIds || !postIds.length)) {
            if (this.mounted && isPermalink && post.error.message.toLowerCase() !== 'network request failed') {
                this.setState({
                    error: formatMessage({
                        id: 'permalink.error.access',
                        defaultMessage: 'Permalink belongs to a deleted message or to a channel to which you do not have access.',
                    }),
                    title: formatMessage({
                        id: 'mobile.search.no_results',
                        defaultMessage: 'No Results Found',
                    }),
                });
            } else if (this.mounted) {
                this.setState({error: post.error.message, retry: true});
            }

            return;
        }

        if (!channelId) {
            const focusedPost = post.data && post.data.posts ? post.data.posts[focusedPostId] : null;
            focusChannelId = focusedPost ? focusedPost.channel_id : '';
            if (focusChannelId) {
                const {data: channel} = await actions.getChannel(focusChannelId);
                if (!this.props.myMembers[focusChannelId] && channel && channel.type === General.OPEN_CHANNEL) {
                    await actions.joinChannel(currentUserId, channel.team_id, channel.id);
                }
            }
        }

        await actions.getPostsAround(focusChannelId, focusedPostId, 10);

        if (this.mounted) {
            this.setState({loading: false});
        }
    };

    onNavigatorEvent = (event) => {
        switch (event.id) {
        case 'backPress':
            this.handleClose();
            break;
        default:
            break;
        }
    };

    retry = () => {
        if (this.mounted) {
            this.setState({loading: true, error: null, retry: false});
            this.loadPosts(this.props);
        }
    };

    archivedIcon = () => {
        const style = getStyleSheet(this.props.theme);
        let icon = null;
        if (this.props.channelIsArchived) {
            icon = (
                <Text>
                    <AwesomeIcon
                        name='archive'
                        style={[style.archiveIcon]}
                    />
                    {' '}
                </Text>
            );
        }
        return icon;
    };

    render() {
        const {
            currentUserId,
            focusedPostId,
            navigator,
            theme,
        } = this.props;
        const {
            error,
            retry,
            loading,
            postIdsState,
            title,
        } = this.state;
        const style = getStyleSheet(theme);

        let postList;
        if (retry) {
            postList = (
                <PostListRetry
                    retry={this.retry}
                    theme={theme}
                />
            );
        } else if (error) {
            postList = (
                <View style={style.errorContainer}>
                    <Text style={style.errorText}>
                        {error}
                    </Text>
                </View>
            );
        } else if (loading) {
            postList = <Loading/>;
        } else {
            postList = (
                <PostList
                    highlightPostId={focusedPostId}
                    indicateNewMessages={false}
                    isSearchResult={false}
                    shouldRenderReplyButton={false}
                    renderReplies={true}
                    onHashtagPress={this.handleHashtagPress}
                    onPermalinkPress={this.handlePermalinkPress}
                    onPostPress={this.goToThread}
                    postIds={postIdsState}
                    lastPostIndex={Platform.OS === 'android' ? getLastPostIndex(postIdsState) : -1}
                    currentUserId={currentUserId}
                    lastViewedAt={0}
                    navigator={navigator}
                    highlightPinnedOrFlagged={false}
                />
            );
        }

        return (
            <SafeAreaView
                backgroundColor='transparent'
                excludeHeader={true}
                footerColor='transparent'
                forceTop={44}
            >
                <View
                    style={style.container}
                >
                    <Animatable.View
                        ref='view'
                        animation='zoomIn'
                        duration={200}
                        delay={0}
                        style={style.wrapper}
                        useNativeDriver={true}
                    >
                        <View
                            style={style.header}
                        >
                            <TouchableOpacity
                                style={style.close}
                                onPress={this.handleClose}
                            >
                                <MaterialIcon
                                    name='close'
                                    size={20}
                                    color={theme.centerChannelColor}
                                />
                            </TouchableOpacity>
                            <View style={style.titleContainer}>
                                <Text
                                    ellipsizeMode='tail'
                                    numberOfLines={1}
                                    style={style.title}
                                >
                                    {this.archivedIcon()}
                                    {title}
                                </Text>
                            </View>
                        </View>
                        <View style={style.dividerContainer}>
                            <View style={style.divider}/>
                        </View>
                        <View style={[style.postList, error ? style.bottom : null]}>
                            {postList}
                        </View>
                        {!error && !loading &&
                        <TouchableOpacity
                            style={[style.footer, style.bottom]}
                            onPress={this.handlePress}
                        >
                            <FormattedText
                                id='mobile.search.jump'
                                defautMessage='Jump to recent messages'
                                style={style.jump}
                            />
                        </TouchableOpacity>
                        }
                    </Animatable.View>
                </View>
            </SafeAreaView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            marginTop: 20,
        },
        wrapper: {
            borderRadius: 6,
            flex: 1,
            margin: 10,
            opacity: 0,
        },
        header: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            flexDirection: 'row',
            height: 44,
            paddingRight: 16,
            width: '100%',
        },
        dividerContainer: {
            backgroundColor: theme.centerChannelBg,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
        close: {
            justifyContent: 'center',
            height: 44,
            width: 40,
            paddingLeft: 7,
        },
        titleContainer: {
            alignItems: 'center',
            flex: 1,
            paddingRight: 40,
        },
        title: {
            color: theme.centerChannelColor,
            fontSize: 17,
            fontWeight: '600',
        },
        postList: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        bottom: {
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6,
        },
        footer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.buttonBg,
            flexDirection: 'row',
            height: 43,
            paddingRight: 16,
            width: '100%',
        },
        jump: {
            color: theme.buttonColor,
            fontSize: 15,
            fontWeight: '600',
            textAlignVertical: 'center',
        },
        errorContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 15,
        },
        errorText: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 15,
        },
        archiveIcon: {
            color: theme.centerChannelColor,
            fontSize: 16,
            paddingRight: 20,
        },
    };
});
