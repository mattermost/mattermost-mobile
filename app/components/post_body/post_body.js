// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    Platform,
    Text,
    TouchableHighlight,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import {Posts} from 'mattermost-redux/constants';

import CombinedSystemMessage from 'app/components/combined_system_message';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import OptionsContext from 'app/components/options_context';

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
        actions: PropTypes.shape({
            flagPost: PropTypes.func.isRequired,
            unflagPost: PropTypes.func.isRequired,
        }).isRequired,
        canAddReaction: PropTypes.bool,
        canDelete: PropTypes.bool,
        canEdit: PropTypes.bool,
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
        onAddReaction: PropTypes.func,
        onCopyPermalink: PropTypes.func,
        onCopyText: PropTypes.func,
        onFailedPostPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        onPostDelete: PropTypes.func,
        onPostEdit: PropTypes.func,
        onPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        postProps: PropTypes.object,
        postType: PropTypes.string,
        renderReplyBar: PropTypes.func,
        showAddReaction: PropTypes.bool,
        showLongPost: PropTypes.bool.isRequired,
        theme: PropTypes.object,
        toggleSelected: PropTypes.func,
    };

    static defaultProps = {
        fileIds: [],
        onAddReaction: emptyFunction,
        onCopyPermalink: emptyFunction,
        onCopyText: emptyFunction,
        onFailedPostPress: emptyFunction,
        onPostDelete: emptyFunction,
        onPostEdit: emptyFunction,
        onPress: emptyFunction,
        renderReplyBar: emptyFunction,
        toggleSelected: emptyFunction,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    state = {
        isLongPost: false,
    };

    flagPost = () => {
        const {actions, postId} = this.props;
        actions.flagPost(postId);
    };

    handleHideUnderlay = () => {
        this.props.toggleSelected(false);
    };

    handleShowUnderlay = () => {
        this.props.toggleSelected(true);
    };

    hideOptionsContext = () => {
        if (Platform.OS === 'ios' && this.refs.options) {
            this.refs.options.hide();
        }
    };

    getPostActions = () => {
        const {formatMessage} = this.context.intl;
        const {
            canEdit,
            canDelete,
            canAddReaction,
            channelIsReadOnly,
            hasBeenDeleted,
            isPending,
            isFailed,
            isFlagged,
            isPostEphemeral,
            isSystemMessage,
            managedConfig,
            onCopyText,
            onPostDelete,
            onPostEdit,
            showAddReaction,
        } = this.props;
        const actions = [];
        const isPendingOrFailedPost = isPending || isFailed;

        // we should check for the user roles and permissions
        if (!isPendingOrFailedPost && !isSystemMessage && !isPostEphemeral) {
            if (showAddReaction && canAddReaction && !channelIsReadOnly) {
                actions.push({
                    text: formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'}),
                    onPress: this.props.onAddReaction,
                });
            }

            if (managedConfig.copyAndPasteProtection !== 'true') {
                actions.push({
                    text: formatMessage({id: 'mobile.post_info.copy_post', defaultMessage: 'Copy Post'}),
                    onPress: onCopyText,
                    copyPost: true,
                });
            }

            if (!channelIsReadOnly) {
                if (isFlagged) {
                    actions.push({
                        text: formatMessage({id: 'post_info.mobile.unflag', defaultMessage: 'Unflag'}),
                        onPress: this.unflagPost,
                    });
                } else {
                    actions.push({
                        text: formatMessage({id: 'post_info.mobile.flag', defaultMessage: 'Flag'}),
                        onPress: this.flagPost,
                    });
                }
            }

            if (canEdit) {
                actions.push({text: formatMessage({id: 'post_info.edit', defaultMessage: 'Edit'}), onPress: onPostEdit});
            }

            if (canDelete && !hasBeenDeleted) {
                actions.push({text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}), onPress: onPostDelete});
            }

            actions.push({
                text: formatMessage({id: 'get_post_link_modal.title', defaultMessage: 'Copy Permalink'}),
                onPress: this.props.onCopyPermalink,
            });
        }

        return actions;
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
        const {managedConfig, navigator, onAddReaction, onPermalinkPress, postId} = this.props;
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
                onAddReaction,
                onPermalinkPress,
            },
        };

        navigator.showModal(options);
    });

    unflagPost = () => {
        const {actions, postId} = this.props;
        actions.unflagPost(postId);
    };

    showOptionsContext = (additionalAction) => {
        if (this.refs.options) {
            this.refs.options.show(additionalAction);
        }
    };

    renderAddChannelMember = (style, textStyles) => {
        const {onPermalinkPress, onPress, postProps} = this.props;

        if (!PostAddChannelMember) {
            PostAddChannelMember = require('app/components/post_add_channel_member').default;
        }

        return (
            <View style={style.row}>
                <View style={style.flex}>
                    <PostAddChannelMember
                        navigator={navigator}
                        onLongPress={this.showOptionsContext}
                        onPermalinkPress={onPermalinkPress}
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
            onPress,
            postId,
            showLongPost,
            toggleSelected,
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
                    hideOptionsContext={this.hideOptionsContext}
                    isFailed={isFailed}
                    onLongPress={this.showOptionsContext}
                    onPress={onPress}
                    postId={postId}
                    toggleSelected={toggleSelected}
                    navigator={navigator}
                />
            );
        }
        return attachments;
    }

    renderPostAdditionalContent = (blockStyles, messageStyle, textStyles) => {
        const {isReplyPost, message, navigator, onPermalinkPress, postId, postProps} = this.props;

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
                onLongPress={this.showOptionsContext}
                isReplyPost={isReplyPost}
                onPermalinkPress={onPermalinkPress}
            />
        );
    };

    renderReactions = () => {
        const {hasReactions, isSearchResult, postId, onAddReaction, showLongPost} = this.props;

        if (!hasReactions || isSearchResult || showLongPost) {
            return null;
        }

        if (!Reactions) {
            Reactions = require('app/components/reactions').default;
        }

        return (
            <Reactions
                postId={postId}
                onAddReaction={onAddReaction}
            />
        );
    };

    renderShowMoreOption = (style) => {
        const {highlight, theme} = this.props;
        const {isLongPost} = this.state;

        if (!isLongPost) {
            return null;
        }

        const gradientColors = [];
        if (highlight) {
            gradientColors.push(
                changeOpacity(theme.mentionHighlightBg, 0),
                changeOpacity(theme.mentionHighlightBg, 0.15),
                changeOpacity(theme.mentionHighlightBg, 0.5),
            );
        } else {
            gradientColors.push(
                changeOpacity(theme.centerChannelBg, 0),
                changeOpacity(theme.centerChannelBg, 0.75),
                theme.centerChannelBg,
            );
        }

        return (
            <View>
                <LinearGradient
                    colors={gradientColors}
                    locations={[0, 0.7, 1]}
                    style={style.showMoreGradient}
                />
                <View style={style.showMoreContainer}>
                    <View style={style.showMoreDividerLeft}/>
                    <TouchableOpacity
                        onPress={this.openLongPost}
                        style={style.showMoreButtonContainer}
                    >
                        <View style={style.showMoreButton}>
                            <Text style={style.showMorePlusSign}>
                                {'+'}
                            </Text>
                            <FormattedText
                                id='mobile.post_body.show_more'
                                defaultMessage='Show More'
                                style={style.showMoreText}
                            />
                        </View>
                    </TouchableOpacity>
                    <View style={style.showMoreDividerRight}/>
                </View>
            </View>
        );
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {
            hasBeenDeleted,
            hasBeenEdited,
            isFailed,
            isPending,
            isPostAddChannelMember,
            isSearchResult,
            isSystemMessage,
            message,
            navigator,
            onFailedPostPress,
            onPermalinkPress,
            onPress,
            postProps,
            postType,
            renderReplyBar,
            theme,
            toggleSelected,
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
                <TouchableHighlight
                    onHideUnderlay={this.handleHideUnderlay}
                    onPress={onPress}
                    onShowUnderlay={this.handleShowUnderlay}
                    underlayColor='transparent'
                >
                    <View style={style.row}>
                        <FormattedText
                            style={messageStyle}
                            id='post_body.deleted'
                            defaultMessage='(message deleted)'
                        />
                    </View>
                </TouchableHighlight>
            );
            body = (<View>{messageComponent}</View>);
        } else if (isPostAddChannelMember) {
            messageComponent = this.renderAddChannelMember(style, textStyles);
        } else if (postType === Posts.POST_TYPES.COMBINED_USER_ACTIVITY) {
            const {allUserIds, messageData} = postProps.user_activity;
            messageComponent = (
                <View style={style.row}>
                    <View style={style.flex}>
                        <CombinedSystemMessage
                            allUserIds={allUserIds}
                            linkStyle={textStyles.link}
                            messageData={messageData}
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
                            isSearchResult={isSearchResult}
                            navigator={navigator}
                            onLongPress={this.showOptionsContext}
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
                <OptionsContext
                    actions={this.getPostActions()}
                    ref='options'
                    onPress={onPress}
                    toggleSelected={toggleSelected}
                    cancelText={formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'})}
                >
                    <View onLayout={this.measurePost}>
                        {messageComponent}
                        {this.renderShowMoreOption(style)}
                    </View>
                    {this.renderPostAdditionalContent(blockStyles, messageStyle, textStyles)}
                    {this.renderFileAttachments()}
                    {this.renderReactions()}
                </OptionsContext>
            );
        }

        return (
            <View style={style.messageContainerWithReplyBar}>
                {renderReplyBar()}
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
        showMoreGradient: {
            flex: 1,
            height: 50,
            position: 'absolute',
            top: -50,
            width: '100%',
        },
        showMoreContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            flexDirection: 'row',
            position: 'relative',
            top: -7.5,
        },
        showMoreDividerLeft: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            flex: 1,
            height: 1,
            marginRight: 10,
        },
        showMoreDividerRight: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            flex: 1,
            height: 1,
            marginLeft: 10,
        },
        showMoreButtonContainer: {
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRadius: 4,
            borderWidth: 1,
            height: 37,
            paddingHorizontal: 10,
        },
        showMoreButton: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
        },
        showMorePlusSign: {
            color: theme.linkColor,
            fontSize: 16,
            fontWeight: '600',
            marginRight: 8,
        },
        showMoreText: {
            color: theme.linkColor,
            fontSize: 13,
            fontWeight: '600',
        },
    };
});
