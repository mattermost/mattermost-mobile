// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import Icon from 'react-native-vector-icons/Ionicons';

import {Posts} from 'mattermost-redux/constants';

import CombinedSystemMessage from 'app/components/combined_system_message';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import ShowMoreButton from 'app/components/show_more_button';

import {emptyFunction} from 'app/utils/general';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

let FileAttachmentList;
let PostAddChannelMember;
let PostBodyAdditionalContent;
let Reactions;

export default class PostBody extends PureComponent {
    static propTypes = {
        canDelete: PropTypes.bool,
        channelIsReadOnly: PropTypes.bool.isRequired,
        fileIds: PropTypes.array,
        hasBeenDeleted: PropTypes.bool,
        hasBeenEdited: PropTypes.bool,
        hasReactions: PropTypes.bool,
        highlight: PropTypes.bool,
        isFailed: PropTypes.bool,
        isFlagged: PropTypes.bool,
        isPending: PropTypes.bool,
        isPostAddChannelMember: PropTypes.bool,
        isPostEphemeral: PropTypes.bool,
        isReplyPost: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        isSystemMessage: PropTypes.bool,
        managedConfig: PropTypes.object,
        message: PropTypes.string,
        navigator: PropTypes.object.isRequired,
        onFailedPostPress: PropTypes.func,
        onHashtagPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        onPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        postProps: PropTypes.object,
        postType: PropTypes.string,
        replyBarStyle: PropTypes.array,
        showAddReaction: PropTypes.bool,
        showLongPost: PropTypes.bool.isRequired,
        theme: PropTypes.object,
    };

    static defaultProps = {
        fileIds: [],
        onFailedPostPress: emptyFunction,
        onPress: emptyFunction,
        replyBarStyle: [],
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    state = {
        isLongPost: false,
    };

    measurePost = (event) => {
        const {height} = event.nativeEvent.layout;
        const {height: deviceHeight} = Dimensions.get('window');
        const {showLongPost} = this.props;

        if (!showLongPost && height >= (deviceHeight * 1.2)) {
            this.setState({
                isLongPost: true,
                maxHeight: (deviceHeight * 0.6),
            });
        }
    };

    openLongPost = preventDoubleTap(() => {
        const {
            managedConfig,
            navigator,
            onHashtagPress,
            onPermalinkPress,
            postId,
        } = this.props;

        const options = {
            screen: 'LongPost',
            animationType: 'none',
            backButtonTitle: '',
            overrideBackPress: true,
            navigatorStyle: {
                navBarHidden: true,
                screenBackgroundColor: changeOpacity('#000', 0.2),
                modalPresentationStyle: 'overCurrentContext',
            },
            passProps: {
                postId,
                managedConfig,
                onHashtagPress,
                onPermalinkPress,
            },
        };

        navigator.showModal(options);
    });

    showPostOptions = () => {
        const {
            canDelete,
            channelIsReadOnly,
            hasBeenDeleted,
            isFailed,
            isFlagged,
            isPending,
            isPostEphemeral,
            isSystemMessage,
            managedConfig,
            navigator,
            postId,
            showAddReaction,
        } = this.props;

        if (isSystemMessage && (!canDelete || hasBeenDeleted)) {
            return;
        }

        if (isPending || isFailed || isPostEphemeral) {
            return;
        }

        const options = {
            screen: 'PostOptions',
            animationType: 'none',
            backButtonTitle: '',
            navigatorStyle: {
                navBarHidden: true,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext',
            },
            passProps: {
                canDelete,
                channelIsReadOnly,
                hasBeenDeleted,
                isFlagged,
                postId,
                managedConfig,
                showAddReaction,
            },
        };

        navigator.showModal(options);
    };

    renderAddChannelMember = (style, messageStyle, textStyles) => {
        const {onPress, postProps} = this.props;

        if (!PostAddChannelMember) {
            PostAddChannelMember = require('app/components/post_add_channel_member').default;
        }

        return (
            <View style={style.row}>
                <View style={style.flex}>
                    <PostAddChannelMember
                        baseTextStyle={messageStyle}
                        navigator={navigator}
                        onPostPress={onPress}
                        textStyles={textStyles}
                        postId={postProps.add_channel_member.post_id}
                        userIds={postProps.add_channel_member.user_ids}
                        usernames={postProps.add_channel_member.usernames}
                    />
                </View>
            </View>
        );
    };

    renderFileAttachments() {
        const {
            fileIds,
            isFailed,
            navigator,
            postId,
            showLongPost,
        } = this.props;

        if (showLongPost) {
            return null;
        }

        let attachments;
        if (fileIds.length > 0) {
            if (!FileAttachmentList) {
                FileAttachmentList = require('app/components/file_attachment_list').default;
            }

            attachments = (
                <FileAttachmentList
                    fileIds={fileIds}
                    isFailed={isFailed}
                    onLongPress={this.showPostOptions}
                    postId={postId}
                    navigator={navigator}
                />
            );
        }
        return attachments;
    }

    renderPostAdditionalContent = (blockStyles, messageStyle, textStyles) => {
        const {isReplyPost, message, navigator, onHashtagPress, onPermalinkPress, postId, postProps} = this.props;

        if (!PostBodyAdditionalContent) {
            PostBodyAdditionalContent = require('app/components/post_body_additional_content').default;
        }

        return (
            <PostBodyAdditionalContent
                baseTextStyle={messageStyle}
                blockStyles={blockStyles}
                navigator={navigator}
                message={message}
                postId={postId}
                postProps={postProps}
                textStyles={textStyles}
                isReplyPost={isReplyPost}
                onHashtagPress={onHashtagPress}
                onPermalinkPress={onPermalinkPress}
            />
        );
    };

    renderReactions = () => {
        const {
            hasReactions,
            isSearchResult,
            navigator,
            postId,
            showLongPost,
        } = this.props;

        if (!hasReactions || isSearchResult || showLongPost) {
            return null;
        }

        if (!Reactions) {
            Reactions = require('app/components/reactions').default;
        }

        return (
            <Reactions
                postId={postId}
                navigator={navigator}
            />
        );
    };

    render() {
        const {
            hasBeenDeleted,
            hasBeenEdited,
            highlight,
            isFailed,
            isPending,
            isPostAddChannelMember,
            isReplyPost,
            isSearchResult,
            isSystemMessage,
            message,
            navigator,
            onFailedPostPress,
            onHashtagPress,
            onPermalinkPress,
            onPress,
            postProps,
            postType,
            replyBarStyle,
            theme,
        } = this.props;
        const {isLongPost, maxHeight} = this.state;
        const style = getStyleSheet(theme);
        const blockStyles = getMarkdownBlockStyles(theme);
        const textStyles = getMarkdownTextStyles(theme);
        const messageStyle = isSystemMessage ? [style.message, style.systemMessage] : style.message;
        const isPendingOrFailedPost = isPending || isFailed;

        let body;
        let messageComponent;
        if (hasBeenDeleted) {
            messageComponent = (
                <View style={style.row}>
                    <FormattedText
                        style={messageStyle}
                        id='post_body.deleted'
                        defaultMessage='(message deleted)'
                    />
                </View>
            );
            body = (<View>{messageComponent}</View>);
        } else if (isPostAddChannelMember) {
            messageComponent = this.renderAddChannelMember(style, messageStyle, textStyles);
        } else if (postType === Posts.POST_TYPES.COMBINED_USER_ACTIVITY) {
            const {allUserIds, allUsernames, messageData} = postProps.user_activity;
            messageComponent = (
                <View style={style.row}>
                    <View style={style.flex}>
                        <CombinedSystemMessage
                            allUserIds={allUserIds}
                            allUsernames={allUsernames}
                            linkStyle={textStyles.link}
                            messageData={messageData}
                            navigator={navigator}
                            textStyles={textStyles}
                            theme={theme}
                        />
                    </View>
                </View>
            );
        } else if (message.length) {
            messageComponent = (
                <View style={style.row}>
                    <View
                        style={[style.flex, (isPendingOrFailedPost && style.pendingPost), (isLongPost && {maxHeight, overflow: 'hidden'})]}
                        removeClippedSubviews={isLongPost}
                    >
                        <Markdown
                            baseTextStyle={messageStyle}
                            blockStyles={blockStyles}
                            isEdited={hasBeenEdited}
                            isReplyPost={isReplyPost}
                            isSearchResult={isSearchResult}
                            navigator={navigator}
                            onHashtagPress={onHashtagPress}
                            onPermalinkPress={onPermalinkPress}
                            onPostPress={onPress}
                            textStyles={textStyles}
                            value={message}
                        />
                    </View>
                </View>
            );
        }

        if (!hasBeenDeleted) {
            body = (
                <View style={style.messageBody}>
                    <View onLayout={this.measurePost}>
                        {messageComponent}
                        {isLongPost &&
                        <ShowMoreButton
                            highlight={highlight}
                            onPress={this.openLongPost}
                        />
                        }
                    </View>
                    {this.renderPostAdditionalContent(blockStyles, messageStyle, textStyles)}
                    {this.renderFileAttachments()}
                    {this.renderReactions()}
                </View>
            );
        }

        return (
            <View style={style.messageContainerWithReplyBar}>
                <View style={replyBarStyle}/>
                <View style={[style.flex, style.row]}>
                    <View style={style.flex}>
                        {body}
                    </View>
                    {isFailed &&
                        <TouchableOpacity
                            onPress={onFailedPostPress}
                            style={style.retry}
                        >
                            <Icon
                                name='ios-information-circle-outline'
                                size={26}
                                color={theme.errorTextColor}
                            />
                        </TouchableOpacity>
                    }
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        row: {
            flexDirection: 'row',
        },
        messageBody: {
            paddingBottom: 2,
            paddingTop: 2,
        },
        retry: {
            justifyContent: 'center',
            marginLeft: 12,
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row',
            flex: 1,
        },
        pendingPost: {
            opacity: 0.5,
        },
        systemMessage: {
            opacity: 0.6,
        },
    };
});
