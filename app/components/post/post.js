// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    Platform,
    View,
    ViewPropTypes,
} from 'react-native';
import {intlShape} from 'react-intl';

import {Posts} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {isPostEphemeral, isPostPendingOrFailed, isSystemMessage} from '@mm-redux/utils/post_utils';

import {showModalOverCurrentContext, showModal} from '@actions/navigation';

import CompassIcon from '@components/compass_icon';
import PostBody from '@components/post_body';
import PostHeader from '@components/post_header';
import PostProfilePicture from '@components/post_profile_picture';
import PostPreHeader from '@components/post_header/post_pre_header';
import TouchableWithFeedback from '@components/touchable_with_feedback';

import {NavigationTypes} from '@constants';

import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';
import {fromAutoResponder} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export default class Post extends PureComponent {
    static propTypes = {
        testID: PropTypes.string,
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
        renderReplies: PropTypes.bool,
        isFirstReply: PropTypes.bool,
        isLastReply: PropTypes.bool,
        isLastPost: PropTypes.bool,
        consecutivePost: PropTypes.bool,
        hasComments: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        commentedOnPost: PropTypes.object,
        managedConfig: PropTypes.object.isRequired,
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
        highlightPinnedOrFlagged: PropTypes.bool,
        skipFlaggedHeader: PropTypes.bool,
        skipPinnedHeader: PropTypes.bool,
        isCommentMention: PropTypes.bool,
        location: PropTypes.string,
        isBot: PropTypes.bool,
        previousPostExists: PropTypes.bool,
        beforePrevPostUserId: PropTypes.string,
    };

    static defaultProps = {
        isSearchResult: false,
        showAddReaction: true,
        showLongPost: false,
        channelIsReadOnly: false,
        highlightPinnedOrFlagged: true,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.postBodyRef = React.createRef();
    }

    goToUserProfile = async () => {
        const {intl} = this.context;
        const {post, theme} = this.props;
        const screen = 'UserProfile';
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {
            userId: post.user_id,
        };

        if (!this.closeButton) {
            this.closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        }

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton,
                }],
            },
        };

        Keyboard.dismiss();
        showModal(screen, title, passProps, options);
    };

    autofillUserMention = (username) => {
        this.props.actions.insertToDraft(`@${username} `);
    };

    handleFailedPostPress = () => {
        const screen = 'OptionsModal';
        const passProps = {
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

        showModalOverCurrentContext(screen, passProps);
    };

    handlePress = preventDoubleTap(() => {
        this.onPressDetected = true;
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

        setTimeout(() => {
            this.onPressDetected = false;
        }, 300);
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
        return Boolean(renderReplies && post.root_id && (!isPostEphemeral(post) || post.state === Posts.POST_DELETED));
    };

    replyBarStyle = () => {
        const {
            commentedOnPost,
            isFirstReply,
            isLastReply,
            theme,
            isCommentMention,
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

        if (isCommentMention) {
            replyBarStyle.push(style.commentMentionBgColor);
        }

        return replyBarStyle;
    };

    viewUserProfile = preventDoubleTap(() => {
        this.goToUserProfile();
    });

    showPostOptions = () => {
        if (this.postBodyRef?.current && !this.onPressDetected) {
            this.postBodyRef.current.showPostOptions();
        }
    };

    render() {
        const {
            testID,
            channelIsReadOnly,
            commentedOnPost,
            highlight,
            isLastPost,
            isLastReply,
            isSearchResult,
            onHashtagPress,
            onPermalinkPress,
            post,
            isBot,
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
            highlightPinnedOrFlagged,
            skipFlaggedHeader,
            skipPinnedHeader,
            location,
            previousPostExists,
            beforePrevPostUserId,
        } = this.props;

        if (!post) {
            return null;
        }

        const style = getStyleSheet(theme);
        const isReplyPost = this.isReplyPost();
        const mergeMessage = consecutivePost && !hasComments && !isBot;
        const highlightFlagged = isFlagged && !skipFlaggedHeader;
        const hightlightPinned = post.is_pinned && !skipPinnedHeader;

        let highlighted;
        if (highlight) {
            highlighted = style.highlight;
        } else if ((highlightFlagged || hightlightPinned) && highlightPinnedOrFlagged) {
            highlighted = style.highlightPinnedOrFlagged;
        }

        let postHeader;
        let userProfile;
        let consecutiveStyle;

        if (mergeMessage) {
            consecutiveStyle = {marginTop: 0};
            userProfile = <View style={style.consecutivePostContainer}/>;
        } else {
            userProfile = (
                <View style={[style.profilePictureContainer, (isPostPendingOrFailed(post) && style.pendingPost)]}>
                    <PostProfilePicture
                        onViewUserProfile={this.viewUserProfile}
                        post={post}
                    />
                </View>
            );
            postHeader = (
                <PostHeader
                    post={post}
                    commentedOnPost={commentedOnPost}
                    createAt={post.create_at}
                    isSearchResult={isSearchResult}
                    shouldRenderReplyButton={shouldRenderReplyButton}
                    showFullDate={showFullDate}
                    onPress={this.handleReply}
                    onUsernamePress={this.viewUserProfile}
                    renderReplies={renderReplies}
                    theme={theme}
                    previousPostExists={previousPostExists}
                    beforePrevPostUserId={beforePrevPostUserId}
                />
            );
        }
        const replyBarStyle = this.replyBarStyle();
        const rightColumnStyle = [style.rightColumn, (commentedOnPost && isLastReply && style.rightColumnPadding)];
        const itemTestID = `${testID}.${post.id}`;

        return (
            <View
                testID={testID}
                style={[style.postStyle, highlighted]}
            >
                <TouchableWithFeedback
                    testID={itemTestID}
                    onPress={this.handlePress}
                    onLongPress={this.showPostOptions}
                    delayLongPress={200}
                    underlayColor={changeOpacity(theme.centerChannelColor, 0.1)}
                    cancelTouchOnPanning={true}
                >
                    <>
                        <PostPreHeader
                            isConsecutive={mergeMessage}
                            isFlagged={isFlagged}
                            isPinned={post.is_pinned}
                            rightColumnStyle={style.preHeaderRightColumn}
                            skipFlaggedHeader={skipFlaggedHeader}
                            skipPinnedHeader={skipPinnedHeader}
                            theme={theme}
                        />
                        <View style={[style.container, this.props.style, consecutiveStyle]}>
                            {userProfile}
                            <View style={rightColumnStyle}>
                                {postHeader}
                                <PostBody
                                    ref={this.postBodyRef}
                                    highlight={highlight}
                                    channelIsReadOnly={channelIsReadOnly}
                                    isLastPost={isLastPost}
                                    isSearchResult={isSearchResult}
                                    onFailedPostPress={this.handleFailedPostPress}
                                    onHashtagPress={onHashtagPress}
                                    onPermalinkPress={onPermalinkPress}
                                    onPress={this.handlePress}
                                    post={post}
                                    replyBarStyle={replyBarStyle}
                                    managedConfig={managedConfig}
                                    isFlagged={isFlagged}
                                    isReplyPost={isReplyPost}
                                    showAddReaction={showAddReaction}
                                    showLongPost={showLongPost}
                                    location={location}
                                />
                            </View>
                        </View>
                    </>
                </TouchableWithFeedback>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        postStyle: {
            overflow: 'hidden',
            flex: 1,
        },
        container: {
            flexDirection: 'row',
        },
        pendingPost: {
            opacity: 0.5,
        },
        preHeaderRightColumn: {
            flex: 1,
            flexDirection: 'column',
            marginLeft: 2,
        },
        rightColumn: {
            flex: 1,
            flexDirection: 'column',
            marginRight: 12,
        },
        rightColumnPadding: {
            paddingBottom: 3,
        },
        consecutivePostContainer: {
            marginBottom: 10,
            marginRight: 10,
            marginLeft: 47,
            marginTop: 10,
        },
        profilePictureContainer: {
            marginBottom: 5,
            marginLeft: 12,
            marginTop: 10,

            // to compensate STATUS_BUFFER in profile_picture component
            ...Platform.select({
                android: {
                    marginRight: 11,
                },
                ios: {
                    marginRight: 10,
                },
            }),
        },
        replyBar: {
            backgroundColor: theme.centerChannelColor,
            opacity: 0.1,
            marginLeft: 1,
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
        commentMentionBgColor: {
            backgroundColor: theme.mentionHighlightBg,
            opacity: 1,
        },
        highlight: {
            backgroundColor: changeOpacity(theme.mentionHighlightBg, 0.5),
        },
        highlightPinnedOrFlagged: {
            backgroundColor: changeOpacity(theme.mentionHighlightBg, 0.2),
        },
    };
});
