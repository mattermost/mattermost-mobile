// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    StyleSheet,
    View,
    ViewPropTypes
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {NavigationTypes} from 'app/constants';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {Posts} from 'mattermost-redux/constants';
import DelayedAction from 'mattermost-redux/utils/delayed_action';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {canDeletePost, canEditPost, isPostEphemeral, isPostPendingOrFailed, isSystemMessage} from 'mattermost-redux/utils/post_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import PostHeader from './post_header';
import PostMessage from './post_message';
import PostProfilePicture from './post_profile_picture';

class Post extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        commentCount: PropTypes.number.isRequired,
        currentUserId: PropTypes.string.isRequired,
        intl: intlShape.isRequired,
        style: ViewPropTypes.style,
        post: PropTypes.object.isRequired,
        user: PropTypes.object,
        displayName: PropTypes.string,
        renderReplies: PropTypes.bool,
        isFirstReply: PropTypes.bool,
        isFlagged: PropTypes.bool,
        isLastReply: PropTypes.bool,
        commentedOnDisplayName: PropTypes.string,
        commentedOnPost: PropTypes.object,
        license: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        roles: PropTypes.string,
        tooltipVisible: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        onPress: PropTypes.func,
        actions: PropTypes.shape({
            createPost: PropTypes.func.isRequired,
            deletePost: PropTypes.func.isRequired,
            flagPost: PropTypes.func.isRequired,
            removePost: PropTypes.func.isRequired,
            setPostTooltipVisible: PropTypes.func.isRequired,
            unflagPost: PropTypes.func.isRequired
        }).isRequired
    };

    constructor(props) {
        super(props);

        const {config, license, currentUserId, roles, post} = props;
        this.editDisableAction = new DelayedAction(this.handleEditDisable);
        this.state = {
            canEdit: canEditPost(config, license, currentUserId, post, this.editDisableAction),
            canDelete: canDeletePost(config, license, currentUserId, post, isAdmin(roles), isSystemAdmin(roles))
        };
    }

    componentWillReceiveProps(nextProps) {
        const {config, license, currentUserId, roles, post} = nextProps;
        this.setState({
            canEdit: canEditPost(config, license, currentUserId, post, this.editDisableAction),
            canDelete: canDeletePost(config, license, currentUserId, post, isAdmin(roles), isSystemAdmin(roles))
        });
    }

    componentWillUnmount() {
        this.editDisableAction.cancel();
    }

    goToUserProfile = (userId) => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'UserProfile',
            title: intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
            animated: true,
            backButtonTitle: '',
            passProps: {
                userId
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    handleEditDisable = () => {
        this.setState({canEdit: false});
    };

    handlePostDelete = () => {
        const {formatMessage} = this.props.intl;
        const {post, actions} = this.props;

        Alert.alert(
            formatMessage({id: 'mobile.post.delete_title', defaultMessage: 'Delete Post'}),
            formatMessage({id: 'mobile.post.delete_question', defaultMessage: 'Are you sure you want to delete this post?'}),
            [{
                text: formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel'
            }, {
                text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: () => {
                    this.editDisableAction.cancel();
                    actions.deletePost(post);
                }
            }]
        );
    };

    handlePostEdit = () => {
        const {intl, navigator, post, theme} = this.props;
        MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).
        then((source) => {
            navigator.showModal({
                screen: 'EditPost',
                title: intl.formatMessage({id: 'mobile.edit_post.title', defaultMessage: 'Editing Message'}),
                animated: true,
                navigatorStyle: {
                    navBarTextColor: theme.sidebarHeaderTextColor,
                    navBarBackgroundColor: theme.sidebarHeaderBg,
                    navBarButtonColor: theme.sidebarHeaderTextColor,
                    screenBackgroundColor: theme.centerChannelBg
                },
                passProps: {
                    post,
                    closeButton: source
                }
            });
        });
    };

    handleFailedPostPress = () => {
        const options = {
            title: {
                id: 'mobile.post.failed_title',
                defaultMessage: 'Unable to send your message:'
            },
            items: [{
                action: () => {
                    const {failed, id, ...post} = this.props.post; // eslint-disable-line

                    EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
                    this.props.actions.createPost(post);
                },
                text: {
                    id: 'mobile.post.failed_retry',
                    defaultMessage: 'Try Again'
                }
            }, {
                action: () => {
                    EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
                    this.onRemovePost(this.props.post);
                },
                text: {
                    id: 'mobile.post.failed_delete',
                    defaultMessage: 'Delete Message'
                },
                textStyle: {
                    color: '#CC3239'
                }
            }]
        };

        this.props.navigator.showModal({
            screen: 'OptionsModal',
            title: '',
            animationType: 'none',
            passProps: {
                items: options.items,
                title: options.title
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext'
            }
        });
    };

    handlePress = () => {
        const {post, onPress, tooltipVisible} = this.props;
        if (!tooltipVisible) {
            if (onPress && post.state !== Posts.POST_DELETED && !isSystemMessage(post) && !isPostPendingOrFailed(post)) {
                preventDoubleTap(onPress, null, post);
            } else if (isPostEphemeral(post)) {
                preventDoubleTap(this.onRemovePost, this, post);
            }
        }
    };

    onRemovePost = (post) => {
        const {removePost} = this.props.actions;
        removePost(post);
    };

    renderReplyBar = (style) => {
        if (!this.props.renderReplies || !this.props.post.root_id) {
            return null;
        }

        const replyBarStyle = [style.replyBar];

        if (this.props.isFirstReply || this.props.commentedOnPost) {
            replyBarStyle.push(style.replyBarFirst);
        }

        if (this.props.isLastReply) {
            replyBarStyle.push(style.replyBarLast);
        }

        return <View style={replyBarStyle}/>;
    };

    viewUserProfile = () => {
        preventDoubleTap(this.goToUserProfile, null, this.props.user.id);
    };

    toggleSelected = (selected) => {
        this.props.actions.setPostTooltipVisible(selected);
        this.setState({selected});
    };

    render() {
        const {
            commentCount,
            commentedOnDisplayName,
            commentedOnPost,
            config,
            displayName,
            isLastReply,
            post,
            renderReplies,
            theme,
            user
        } = this.props;
        const style = getStyleSheet(theme);
        const isPostSystemMessage = isSystemMessage(post);
        const pendingOrFailed = isPostPendingOrFailed(post);
        const selected = this.state && this.state.selected ? style.selected : null;
        const showReplyBar = !!commentedOnPost; //eslint-disable-line no-implicit-coercion

        return (
            <View style={[style.container, this.props.style, selected]}>
                <View style={[style.profilePictureContainer, (pendingOrFailed && style.pendingPost)]}>
                    <PostProfilePicture
                        enablePostIconOverride={config.EnablePostIconOverride === 'true'}
                        fromWebHook={post.props && post.props.from_webhook === 'true'}
                        isSystemMessage={isPostSystemMessage}
                        onViewUserProfile={this.viewUserProfile}
                        overrideIconUrl={post.props && post.props.override_icon_url}
                        theme={theme}
                        user={user}
                    />
                </View>
                <View style={style.messageContainerWithReplyBar}>
                    {!commentedOnPost && this.renderReplyBar(style)}
                    <View style={[style.rightColumn, (commentedOnPost && isLastReply && style.rightColumnPadding)]}>
                        <PostHeader
                            commentCount={commentCount}
                            commentedOnDisplayName={commentedOnDisplayName}
                            commentedOnPost={commentedOnPost}
                            createAt={post.create_at}
                            displayName={displayName}
                            enablePostUsernameOverride={config.EnablePostUsernameOverride === 'true'}
                            fromWebHook={post.props && post.props.from_webhook === 'true'}
                            isPendingOrFailedPost={pendingOrFailed}
                            isSystemMessage={isPostSystemMessage}
                            onPress={this.handlePress}
                            onViewUserProfile={this.viewUserProfile}
                            overrideUsername={post.props && post.props.override_username}
                            renderReplies={renderReplies}
                            theme={theme}
                        />
                        <PostMessage
                            attachments={post.props && post.props.attachments}
                            canDelete={this.state.canDelete}
                            canEdit={this.state.canEdit}
                            fileIds={post.file_ids}
                            hasBeenDeleted={post.state === Posts.POST_DELETED}
                            intl={this.props.intl}
                            isFlagged={this.props.isFlagged}
                            isPendingOrFailedPost={pendingOrFailed}
                            isSystemMessage={isPostSystemMessage}
                            flagPost={() => this.props.actions.flagPost(post.id)}
                            message={post.message}
                            navigator={this.props.navigator}
                            onFailedPostPress={this.handleFailedPostPress}
                            onPostDelete={this.handlePostDelete}
                            onPostEdit={this.handlePostEdit}
                            onPress={this.handlePress}
                            postId={post.id}
                            renderReplyBar={() => this.renderReplyBar(style)}
                            showReplyBar={showReplyBar}
                            theme={theme}
                            toggleSelected={this.toggleSelected}
                            unflagPost={() => this.props.actions.unflagPost(post.id)}
                        />
                    </View>
                </View>
            </View>
        );
    }

}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row'
        },
        pendingPost: {
            opacity: 0.5
        },
        rightColumn: {
            flex: 1,
            flexDirection: 'column',
            marginRight: 12
        },
        rightColumnPadding: {
            paddingBottom: 3
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row',
            flex: 1
        },
        profilePictureContainer: {
            marginBottom: 10,
            marginRight: 10,
            marginLeft: 12,
            marginTop: 10
        },
        replyBar: {
            backgroundColor: theme.centerChannelColor,
            opacity: 0.1,
            marginRight: 10,
            width: 3,
            flexBasis: 3
        },
        replyBarFirst: {
            paddingTop: 10
        },
        replyBarLast: {
            paddingBottom: 10
        },
        selected: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1)
        }
    });
});

export default injectIntl(Post);
