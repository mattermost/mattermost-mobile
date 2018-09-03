// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Clipboard,
    Platform,
    TouchableHighlight,
    View,
    ViewPropTypes,
} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import FlagIcon from 'app/components/flag_icon';
import PostBody from 'app/components/post_body';
import PostHeader from 'app/components/post_header';
import PostProfilePicture from 'app/components/post_profile_picture';
import {NavigationTypes} from 'app/constants';
import {fromAutoResponder} from 'app/utils/general';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {getToolTipVisible} from 'app/utils/tooltip';

import {Posts} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {isPostEphemeral, isPostPendingOrFailed, isSystemMessage} from 'mattermost-redux/utils/post_utils';

import Config from 'assets/config';

export default class Post extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReaction: PropTypes.func.isRequired,
            createPost: PropTypes.func.isRequired,
            deletePost: PropTypes.func.isRequired,
            insertToDraft: PropTypes.func.isRequired,
            removePost: PropTypes.func.isRequired,
        }).isRequired,
        channelIsReadOnly: PropTypes.bool,
        currentTeamUrl: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        highlight: PropTypes.bool,
        style: ViewPropTypes.style,
        post: PropTypes.object,
        postId: PropTypes.string.isRequired, // Used by container // eslint-disable-line no-unused-prop-types
        renderReplies: PropTypes.bool,
        isFirstReply: PropTypes.bool,
        isLastReply: PropTypes.bool,
        consecutivePost: PropTypes.bool,
        hasComments: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        commentedOnPost: PropTypes.object,
        managedConfig: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        canEdit: PropTypes.bool.isRequired,
        canEditUntil: PropTypes.number.isRequired,
        canDelete: PropTypes.bool.isRequired,
        onPermalinkPress: PropTypes.func,
        shouldRenderReplyButton: PropTypes.bool,
        showAddReaction: PropTypes.bool,
        showFullDate: PropTypes.bool,
        showLongPost: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        onPress: PropTypes.func,
        onReply: PropTypes.func,
        isFlagged: PropTypes.bool,
    };

    static defaultProps = {
        isSearchResult: false,
        showAddReaction: true,
        showLongPost: false,
        channelIsReadOnly: false,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    goToUserProfile = () => {
        const {intl} = this.context;
        const {navigator, post, theme} = this.props;
        const options = {
            screen: 'UserProfile',
            title: intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
            animated: true,
            backButtonTitle: '',
            passProps: {
                userId: post.user_id,
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        };

        if (Platform.OS === 'ios') {
            navigator.push(options);
        } else {
            navigator.showModal(options);
        }
    };

    autofillUserMention = (username) => {
        this.props.actions.insertToDraft(`@${username} `);
    };

    handleEditDisable = () => {
        this.setState({canEdit: false});
    };

    handlePostDelete = () => {
        const {formatMessage} = this.context.intl;
        const {actions, currentUserId, post} = this.props;

        Alert.alert(
            formatMessage({id: 'mobile.post.delete_title', defaultMessage: 'Delete Post'}),
            formatMessage({
                id: 'mobile.post.delete_question',
                defaultMessage: 'Are you sure you want to delete this post?',
            }),
            [{
                text: formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }, {
                text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: () => {
                    actions.deletePost(post);
                    if (post.user_id === currentUserId) {
                        actions.removePost(post);
                    }
                },
            }]
        );
    };

    handlePostEdit = () => {
        const {intl} = this.context;
        const {navigator, post, theme} = this.props;
        MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((source) => {
            navigator.showModal({
                screen: 'EditPost',
                title: intl.formatMessage({id: 'mobile.edit_post.title', defaultMessage: 'Editing Message'}),
                animated: true,
                navigatorStyle: {
                    navBarTextColor: theme.sidebarHeaderTextColor,
                    navBarBackgroundColor: theme.sidebarHeaderBg,
                    navBarButtonColor: theme.sidebarHeaderTextColor,
                    screenBackgroundColor: theme.centerChannelBg,
                },
                passProps: {
                    post,
                    closeButton: source,
                },
            });
        });
    };

    handleAddReactionToPost = (emoji) => {
        const {post} = this.props;
        this.props.actions.addReaction(post.id, emoji);
    };

    handleAddReaction = preventDoubleTap(() => {
        const {intl} = this.context;
        const {navigator, post, theme} = this.props;

        MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((source) => {
            navigator.showModal({
                screen: 'AddReaction',
                title: intl.formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'}),
                animated: true,
                navigatorStyle: {
                    navBarTextColor: theme.sidebarHeaderTextColor,
                    navBarBackgroundColor: theme.sidebarHeaderBg,
                    navBarButtonColor: theme.sidebarHeaderTextColor,
                    screenBackgroundColor: theme.centerChannelBg,
                },
                passProps: {
                    post,
                    closeButton: source,
                    onEmojiPress: this.handleAddReactionToPost,
                },
            });
        });
    });

    handleFailedPostPress = () => {
        const options = {
            title: {
                id: 'mobile.post.failed_title',
                defaultMessage: 'Unable to send your message:',
            },
            items: [{
                action: () => {
                    const {failed, id, ...post} = this.props.post; // eslint-disable-line

                    EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
                    this.props.actions.createPost(post);
                },
                text: {
                    id: 'mobile.post.failed_retry',
                    defaultMessage: 'Try Again',
                },
            }, {
                action: () => {
                    EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
                    this.onRemovePost(this.props.post);
                },
                text: {
                    id: 'mobile.post.failed_delete',
                    defaultMessage: 'Delete Message',
                },
                textStyle: {
                    color: '#CC3239',
                },
            }],
        };

        this.props.navigator.showModal({
            screen: 'OptionsModal',
            title: '',
            animationType: 'none',
            passProps: {
                items: options.items,
                title: options.title,
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext',
            },
        });
    };

    handlePress = preventDoubleTap(() => {
        const {
            onPress,
            post,
            showLongPost,
        } = this.props;

        if (!getToolTipVisible()) {
            const isValidSystemMessage = fromAutoResponder(post) || !isSystemMessage(post);
            if (onPress && post.state !== Posts.POST_DELETED && isValidSystemMessage && !isPostPendingOrFailed(post)) {
                onPress(post);
            } else if ((isPostEphemeral(post) || post.state === Posts.POST_DELETED) && !showLongPost) {
                this.onRemovePost(post);
            }
        } else if (this.refs.postBody) {
            this.refs.postBody.getWrappedInstance().hideOptionsContext();
            this.handleHideUnderlay();
        }
    });

    handleReply = preventDoubleTap(() => {
        const {post, onReply} = this.props;
        if (!getToolTipVisible() && onReply) {
            return onReply(post);
        }

        return this.handlePress();
    });

    onRemovePost = (post) => {
        const {removePost} = this.props.actions;
        removePost(post);
    };

    isReplyPost = () => {
        const {renderReplies, post} = this.props;
        return Boolean(renderReplies && post.root_id && !isPostEphemeral(post));
    };

    replyBarStyle = () => {
        const {
            commentedOnPost,
            isFirstReply,
            isLastReply,
            theme,
        } = this.props;

        if (!this.isReplyPost()) {
            return null;
        }

        const style = getStyleSheet(theme);
        const replyBarStyle = [style.replyBar];

        if (isFirstReply || commentedOnPost) {
            replyBarStyle.push(style.replyBarFirst);
        }

        if (isLastReply) {
            replyBarStyle.push(style.replyBarLast);
        }

        return replyBarStyle;
    };

    viewUserProfile = preventDoubleTap(() => {
        if (!getToolTipVisible()) {
            this.goToUserProfile();
        }
    });

    toggleSelected = (selected) => {
        if (!getToolTipVisible()) {
            this.setState({selected});
        }
    };

    handleCopyText = (text) => {
        let textToCopy = this.props.post.message;
        if (typeof text === 'string') {
            textToCopy = text;
        }

        Clipboard.setString(textToCopy);
    };

    handleCopyPermalink = () => {
        const {currentTeamUrl, postId} = this.props;
        const permalink = `${currentTeamUrl}/pl/${postId}`;

        Clipboard.setString(permalink);
    };

    handleHideUnderlay = () => {
        this.toggleSelected(false);
    };

    handleShowUnderlay = () => {
        this.toggleSelected(true);
    };

    showOptionsContext = () => {
        if (this.refs.postBody) {
            this.refs.postBody.getWrappedInstance().showOptionsContext();
        }
    };

    render() {
        const {
            channelIsReadOnly,
            commentedOnPost,
            highlight,
            isLastReply,
            isSearchResult,
            onPermalinkPress,
            post,
            renderReplies,
            shouldRenderReplyButton,
            showAddReaction,
            showFullDate,
            showLongPost,
            theme,
            managedConfig,
            consecutivePost,
            hasComments,
            isFlagged,
        } = this.props;

        if (!post) {
            return null;
        }

        const style = getStyleSheet(theme);
        const selected = this.state && this.state.selected ? style.selected : null;
        const highlighted = highlight ? style.highlight : null;
        const isReplyPost = this.isReplyPost();
        const onUsernamePress = Config.ExperimentalUsernamePressIsMention ? this.autofillUserMention : this.viewUserProfile;
        const mergeMessage = consecutivePost && !hasComments;

        let postHeader;
        let userProfile;
        let consecutiveStyle;

        if (mergeMessage) {
            consecutiveStyle = {marginTop: 0};
            if (isFlagged) {
                userProfile = (
                    <View style={style.consecutivePostContainer}>
                        <View style={style.consecutivePostWithFlag}>
                            <FlagIcon
                                height={11}
                                width={11}
                                color={theme.linkColor}
                            />
                        </View>
                    </View>
                );
            } else {
                userProfile = <View style={style.consecutivePostContainer}/>;
            }
        } else {
            userProfile = (
                <TouchableHighlight
                    style={[style.profilePictureContainer, (isPostPendingOrFailed(post) && style.pendingPost)]}
                    onPress={this.handlePress}
                    onHideUnderlay={this.handleHideUnderlay}
                    onShowUnderlay={this.handleShowUnderlay}
                    onLongPress={this.showOptionsContext}
                    underlayColor='transparent'
                >
                    <PostProfilePicture
                        onViewUserProfile={this.viewUserProfile}
                        postId={post.id}
                    />
                </TouchableHighlight>
            );
            postHeader = (
                <PostHeader
                    postId={post.id}
                    commentedOnUserId={commentedOnPost && commentedOnPost.user_id}
                    createAt={post.create_at}
                    isSearchResult={isSearchResult}
                    shouldRenderReplyButton={shouldRenderReplyButton}
                    showFullDate={showFullDate}
                    onPress={this.handleReply}
                    onUsernamePress={onUsernamePress}
                    renderReplies={renderReplies}
                    theme={theme}
                    isFlagged={isFlagged}
                />
            );
        }
        const replyBarStyle = this.replyBarStyle();

        return (
            <View style={[style.container, this.props.style, consecutiveStyle, highlighted, selected]}>
                {userProfile}
                <View style={style.messageContainerWithReplyBar}>
                    <View style={[style.rightColumn, (commentedOnPost && isLastReply && style.rightColumnPadding)]}>
                        {postHeader}
                        <PostBody
                            ref={'postBody'}
                            canDelete={this.props.canDelete}
                            canEdit={this.props.canEdit}
                            canEditUntil={this.props.canEditUntil}
                            highlight={highlight}
                            channelIsReadOnly={channelIsReadOnly}
                            isSearchResult={isSearchResult}
                            navigator={this.props.navigator}
                            onAddReaction={this.handleAddReaction}
                            onCopyPermalink={this.handleCopyPermalink}
                            onCopyText={this.handleCopyText}
                            onFailedPostPress={this.handleFailedPostPress}
                            onPermalinkPress={onPermalinkPress}
                            onPostDelete={this.handlePostDelete}
                            onPostEdit={this.handlePostEdit}
                            onPress={this.handlePress}
                            postId={post.id}
                            replyBarStyle={replyBarStyle}
                            toggleSelected={this.toggleSelected}
                            managedConfig={managedConfig}
                            isFlagged={isFlagged}
                            isReplyPost={isReplyPost}
                            showAddReaction={showAddReaction}
                            showLongPost={showLongPost}
                        />
                    </View>
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            overflow: 'hidden',
        },
        pendingPost: {
            opacity: 0.5,
        },
        rightColumn: {
            flex: 1,
            flexDirection: 'column',
            marginRight: 12,
        },
        rightColumnPadding: {
            paddingBottom: 3,
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row',
            flex: 1,
        },
        consecutivePostContainer: {
            marginBottom: 10,
            marginRight: 10,
            marginLeft: 47,
            marginTop: 10,
        },
        consecutivePostWithFlag: {
            width: 11,
            height: 11,
            position: 'absolute',
            top: -6,
            left: -11,
        },
        profilePictureContainer: {
            marginBottom: 5,
            marginRight: 10,
            marginLeft: 12,
            marginTop: 10,
        },
        replyBar: {
            backgroundColor: theme.centerChannelColor,
            opacity: 0.1,
            marginRight: 7,
            width: 3,
            flexBasis: 3,
        },
        replyBarFirst: {
            paddingTop: 10,
        },
        replyBarLast: {
            paddingBottom: 10,
        },
        selected: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        highlight: {
            backgroundColor: changeOpacity(theme.mentionHighlightBg, 0.5),
        },
    };
});
