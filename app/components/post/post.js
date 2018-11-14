// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    TouchableHighlight,
    View,
    ViewPropTypes,
} from 'react-native';
import {intlShape} from 'react-intl';

import FlagIcon from 'app/components/flag_icon';
import PostBody from 'app/components/post_body';
import PostHeader from 'app/components/post_header';
import PostProfilePicture from 'app/components/post_profile_picture';
import {NavigationTypes} from 'app/constants';
import {fromAutoResponder} from 'app/utils/general';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

import {Posts} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {isPostEphemeral, isPostPendingOrFailed, isSystemMessage} from 'mattermost-redux/utils/post_utils';

import Config from 'assets/config';

export default class Post extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            createPost: PropTypes.func.isRequired,
            insertToDraft: PropTypes.func.isRequired,
            removePost: PropTypes.func.isRequired,
        }).isRequired,
        channelIsReadOnly: PropTypes.bool,
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
        onHashtagPress: PropTypes.func,
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

    handleFailedPostPress = () => {
        const options = {
            title: {
                id: t('mobile.post.failed_title'),
                defaultMessage: 'Unable to send your message:',
            },
            items: [{
                action: () => {
                    const {failed, id, ...post} = this.props.post; // eslint-disable-line

                    EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
                    this.props.actions.createPost(post);
                },
                text: {
                    id: t('mobile.post.failed_retry'),
                    defaultMessage: 'Try Again',
                },
            }, {
                action: () => {
                    EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
                    this.onRemovePost(this.props.post);
                },
                text: {
                    id: t('mobile.post.failed_delete'),
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

        const isValidSystemMessage = fromAutoResponder(post) || !isSystemMessage(post);
        if (onPress && post.state !== Posts.POST_DELETED && isValidSystemMessage && !isPostPendingOrFailed(post)) {
            onPress(post);
        } else if ((isPostEphemeral(post) || post.state === Posts.POST_DELETED) && !showLongPost) {
            this.onRemovePost(post);
        }
    });

    handleReply = preventDoubleTap(() => {
        const {post, onReply} = this.props;
        if (onReply) {
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
        this.goToUserProfile();
    });

    toggleSelected = (selected) => {
        this.setState({selected});
    };

    handleHideUnderlay = () => {
        this.toggleSelected(false);
    };

    handleShowUnderlay = () => {
        this.toggleSelected(true);
    };

    showPostOptions = () => {
        if (this.refs.postBody) {
            this.refs.postBody.getWrappedInstance().showPostOptions();
        }
    };

    render() {
        const {
            channelIsReadOnly,
            commentedOnPost,
            highlight,
            isLastReply,
            isSearchResult,
            onHashtagPress,
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
                    onLongPress={this.showPostOptions}
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
                            highlight={highlight}
                            channelIsReadOnly={channelIsReadOnly}
                            isSearchResult={isSearchResult}
                            navigator={this.props.navigator}
                            onFailedPostPress={this.handleFailedPostPress}
                            onHashtagPress={onHashtagPress}
                            onPermalinkPress={onPermalinkPress}
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
