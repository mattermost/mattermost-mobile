// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Clipboard,
    View,
    ViewPropTypes
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {isToolTipShowing} from 'react-native-tooltip';

import PostBody from 'app/components/post_body';
import PostHeader from 'app/components/post_header';
import PostProfilePicture from 'app/components/post_profile_picture';
import {NavigationTypes} from 'app/constants';
import {emptyFunction} from 'app/utils/general';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {Posts} from 'mattermost-redux/constants';
import DelayedAction from 'mattermost-redux/utils/delayed_action';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {canDeletePost, canEditPost, isPostEphemeral, isPostPendingOrFailed, isSystemMessage} from 'mattermost-redux/utils/post_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import Config from 'assets/config';

class Post extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReaction: PropTypes.func.isRequired,
            createPost: PropTypes.func.isRequired,
            deletePost: PropTypes.func.isRequired,
            insertToDraft: PropTypes.func.isRequired,
            removePost: PropTypes.func.isRequired
        }).isRequired,
        config: PropTypes.object.isRequired,
        currentTeamUrl: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        highlight: PropTypes.bool,
        intl: intlShape.isRequired,
        style: ViewPropTypes.style,
        post: PropTypes.object,
        postId: PropTypes.string.isRequired, // Used by container // eslint-disable-line no-unused-prop-types
        renderReplies: PropTypes.bool,
        isFirstReply: PropTypes.bool,
        isLastReply: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        commentedOnPost: PropTypes.object,
        license: PropTypes.object.isRequired,
        managedConfig: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        roles: PropTypes.string,
        shouldRenderReplyButton: PropTypes.bool,
        showFullDate: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        onPress: PropTypes.func,
        onReply: PropTypes.func,
        isFlagged: PropTypes.bool
    };

    static defaultProps = {
        isSearchResult: false
    };

    constructor(props) {
        super(props);

        const {config, license, currentUserId, roles, post} = props;
        this.editDisableAction = new DelayedAction(this.handleEditDisable);
        if (post) {
            this.state = {
                canEdit: canEditPost(config, license, currentUserId, post, this.editDisableAction),
                canDelete: canDeletePost(config, license, currentUserId, post, isAdmin(roles), isSystemAdmin(roles))
            };
        } else {
            this.state = {
                canEdit: false,
                canDelete: false
            };
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.config !== this.props.config ||
            nextProps.license !== this.props.license ||
            nextProps.currentUserId !== this.props.currentUserId ||
            nextProps.post !== this.props.post ||
            nextProps.roles !== this.props.roles) {
            const {config, license, currentUserId, roles, post} = nextProps;

            this.setState({
                canEdit: canEditPost(config, license, currentUserId, post, this.editDisableAction),
                canDelete: canDeletePost(config, license, currentUserId, post, isAdmin(roles), isSystemAdmin(roles))
            });
        }
    }

    componentWillUnmount() {
        this.editDisableAction.cancel();
    }

    goToUserProfile = () => {
        const {intl, navigator, post, theme} = this.props;
        navigator.push({
            screen: 'UserProfile',
            title: intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
            animated: true,
            backButtonTitle: '',
            passProps: {
                userId: post.user_id
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    autofillUserMention = (username) => {
        // create a general action that checks for currentThreadId in the state and decides
        // whether to insert to root or thread
        this.props.actions.insertToDraft(`@${username} `);
    }

    handleEditDisable = () => {
        this.setState({canEdit: false});
    };

    handlePostDelete = () => {
        const {formatMessage} = this.props.intl;
        const {actions, currentUserId, post} = this.props;

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
                    if (post.user_id === currentUserId) {
                        actions.removePost(post);
                    }
                }
            }]
        );
    };

    handlePostEdit = () => {
        const {intl, navigator, post, theme} = this.props;
        MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((source) => {
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

    handleAddReactionToPost = (emoji) => {
        const {post} = this.props;
        this.props.actions.addReaction(post.id, emoji);
    }

    handleAddReaction = () => {
        const {intl, navigator, post, theme} = this.props;

        MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).
            then((source) => {
                navigator.showModal({
                    screen: 'AddReaction',
                    title: intl.formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'}),
                    animated: true,
                    navigatorStyle: {
                        navBarTextColor: theme.sidebarHeaderTextColor,
                        navBarBackgroundColor: theme.sidebarHeaderBg,
                        navBarButtonColor: theme.sidebarHeaderTextColor,
                        screenBackgroundColor: theme.centerChannelBg
                    },
                    passProps: {
                        post,
                        closeButton: source,
                        onEmojiPress: this.handleAddReactionToPost
                    }
                });
            });
    }

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
        const {
            isSearchResult,
            onPress,
            post
        } = this.props;

        if (!isToolTipShowing) {
            if (onPress && post.state !== Posts.POST_DELETED && !isSystemMessage(post) && !isPostPendingOrFailed(post)) {
                preventDoubleTap(onPress, null, post);
            } else if (!isSearchResult && isPostEphemeral(post)) {
                preventDoubleTap(this.onRemovePost, this, post);
            }
        }
    };

    handleReply = () => {
        const {post, onReply} = this.props;
        if (!isToolTipShowing && onReply) {
            return preventDoubleTap(onReply, null, post);
        }

        return this.handlePress();
    };

    onRemovePost = (post) => {
        const {removePost} = this.props.actions;
        removePost(post);
    };

    isReplyPost = () => {
        const {renderReplies, post} = this.props;
        return Boolean(renderReplies && post.root_id && !isPostEphemeral(post));
    };

    renderReplyBar = () => {
        const {
            commentedOnPost,
            isFirstReply,
            isLastReply,
            theme
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

        return <View style={replyBarStyle}/>;
    };

    viewUserProfile = () => {
        const {isSearchResult} = this.props;

        if (!isSearchResult && !isToolTipShowing) {
            preventDoubleTap(this.goToUserProfile, this);
        }
    };

    toggleSelected = (selected) => {
        if (!isToolTipShowing) {
            this.setState({selected});
        }
    };

    handleCopyText = (text) => {
        let textToCopy = this.props.post.message;
        if (typeof text === 'string') {
            textToCopy = text;
        }

        Clipboard.setString(textToCopy);
    }

    handleCopyPermalink = () => {
        const {currentTeamUrl, postId} = this.props;
        const permalink = `${currentTeamUrl}/pl/${postId}`;

        Clipboard.setString(permalink);
    }

    render() {
        const {
            commentedOnPost,
            highlight,
            isLastReply,
            isSearchResult,
            post,
            renderReplies,
            shouldRenderReplyButton,
            showFullDate,
            theme,
            managedConfig,
            isFlagged
        } = this.props;

        if (!post) {
            return null;
        }

        const style = getStyleSheet(theme);
        const selected = this.state && this.state.selected ? style.selected : null;
        const highlighted = highlight ? style.highlight : null;
        const isReplyPost = this.isReplyPost();

        const onUsernamePress = Config.ExperimentalUsernamePressIsMention ? this.autofillUserMention : this.viewUserProfile;

        // postWidth = deviceWidth - profilePic width - profilePictureContainer margins - right column margin
        const postWidth = this.props.deviceWidth - 66;

        return (
            <View style={[style.container, this.props.style, highlighted, selected]}>
                <View style={[style.profilePictureContainer, (isPostPendingOrFailed(post) && style.pendingPost)]}>
                    <PostProfilePicture
                        onViewUserProfile={this.viewUserProfile}
                        postId={post.id}
                    />
                </View>
                <View style={style.messageContainerWithReplyBar}>
                    {!commentedOnPost && this.renderReplyBar()}
                    <View style={[style.rightColumn, (commentedOnPost && isLastReply && style.rightColumnPadding)]}>
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
                        <View style={{maxWidth: postWidth}}>
                            <PostBody
                                canDelete={this.state.canDelete}
                                canEdit={this.state.canEdit}
                                isSearchResult={isSearchResult}
                                navigator={this.props.navigator}
                                onAddReaction={this.handleAddReaction}
                                onCopyPermalink={this.handleCopyPermalink}
                                onCopyText={this.handleCopyText}
                                onFailedPostPress={this.handleFailedPostPress}
                                onPostDelete={this.handlePostDelete}
                                onPostEdit={this.handlePostEdit}
                                onPress={this.handlePress}
                                postId={post.id}
                                renderReplyBar={commentedOnPost ? this.renderReplyBar : emptyFunction}
                                toggleSelected={this.toggleSelected}
                                managedConfig={managedConfig}
                                isFlagged={isFlagged}
                                isReplyPost={isReplyPost}
                            />
                        </View>
                    </View>
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
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
        },
        highlight: {
            backgroundColor: changeOpacity(theme.mentionHighlightBg, 0.5)
        }
    };
});

export default injectIntl(Post);
