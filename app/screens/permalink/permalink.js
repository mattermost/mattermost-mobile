// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import * as Animatable from 'react-native-animatable';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {General} from 'mattermost-redux/constants';

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
            getPostsAfter: PropTypes.func.isRequired,
            getPostsBefore: PropTypes.func.isRequired,
            getPostThread: PropTypes.func.isRequired,
            getChannel: PropTypes.func.isRequired,
            handleSelectChannel: PropTypes.func.isRequired,
            handleTeamChange: PropTypes.func.isRequired,
            joinChannel: PropTypes.func.isRequired,
            loadThreadIfNecessary: PropTypes.func.isRequired,
            markChannelAsRead: PropTypes.func.isRequired,
            markChannelAsViewed: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string,
        channelName: PropTypes.string,
        channelTeamId: PropTypes.string,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        focusedPostId: PropTypes.string.isRequired,
        isPermalink: PropTypes.bool,
        myMembers: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        onClose: PropTypes.func,
        onPermalinkPress: PropTypes.func,
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

    constructor(props) {
        super(props);

        const {postIds, channelName} = props;
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
        };
    }

    componentWillMount() {
        if (this.state.loading) {
            this.loadPosts(this.props);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.channelName !== nextProps.channelName) {
            this.setState({title: nextProps.channelName});
        }

        if (this.props.focusedPostId !== nextProps.focusedPostId) {
            this.setState({loading: true});
            if (nextProps.postIds && nextProps.postIds.length < 10) {
                this.loadPosts(nextProps);
            } else {
                this.setState({loading: false});
            }
        }
    }

    goToThread = preventDoubleTap((post) => {
        const {actions, navigator, theme} = this.props;
        const channelId = post.channel_id;
        const rootId = (post.root_id || post.id);

        actions.loadThreadIfNecessary(rootId, channelId);
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
            this.refs.view.zoomOut().then(() => {
                actions.selectPost('');
                navigator.dismissModal({animationType: 'none'});

                if (onClose) {
                    onClose();
                }
            });
        }
    };

    handlePress = () => {
        const {channelId, channelName} = this.props;

        if (this.refs.view) {
            this.refs.view.growOut().then(() => {
                this.jumpToChannel(channelId, channelName);
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
                markChannelAsRead,
                setChannelLoading,
                setChannelDisplayName,
                markChannelAsViewed,
            } = actions;

            actions.selectPost('');

            if (onClose) {
                onClose();
            }

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
            });

            if (channelTeamId && currentTeamId !== channelTeamId) {
                handleTeamChange(channelTeamId, false);
            }

            setChannelLoading(channelId !== currentChannelId);
            setChannelDisplayName(channelDisplayName);
            handleSelectChannel(channelId);

            InteractionManager.runAfterInteractions(async () => {
                markChannelAsRead(channelId, currentChannelId);
                if (channelId !== currentChannelId) {
                    markChannelAsViewed(currentChannelId);
                }
            });
        }
    };

    loadPosts = async (props) => {
        const {intl} = this.context;
        const {actions, channelId, currentUserId, focusedPostId, isPermalink, postIds} = props;
        const {formatMessage} = intl;
        let focusChannelId = channelId;

        const post = await actions.getPostThread(focusedPostId, false);
        if (post.error && (!postIds || !postIds.length)) {
            if (isPermalink && post.error.message.toLowerCase() !== 'network request failed') {
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
            } else {
                this.setState({error: post.error.message, retry: true});
            }

            return;
        }

        if (!channelId) {
            focusChannelId = post.data.posts[focusedPostId].channel_id;
            if (!this.props.myMembers[focusChannelId]) {
                const {data: channel} = await actions.getChannel(focusChannelId);
                if (channel && channel.type === General.OPEN_CHANNEL) {
                    await actions.joinChannel(currentUserId, channel.team_id, channel.id);
                }
            }
        }

        await Promise.all([
            actions.getPostsBefore(focusChannelId, focusedPostId, 0, 10),
            actions.getPostsAfter(focusChannelId, focusedPostId, 0, 10),
        ]);

        this.setState({loading: false});
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
        this.setState({loading: true, error: null, retry: false});
        this.loadPosts(this.props);
    };

    render() {
        const {
            currentUserId,
            focusedPostId,
            navigator,
            onPermalinkPress,
            postIds,
            theme,
        } = this.props;
        const {error, retry, loading, title} = this.state;
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
                    onPermalinkPress={onPermalinkPress}
                    onPostPress={this.goToThread}
                    postIds={postIds}
                    currentUserId={currentUserId}
                    lastViewedAt={0}
                    navigator={navigator}
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
                                    {title}
                                </Text>
                            </View>
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
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            flexDirection: 'row',
            height: 44,
            paddingRight: 16,
            width: '100%',
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
    };
});
