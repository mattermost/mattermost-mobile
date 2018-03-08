// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    TouchableHighlight,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import Icon from 'react-native-vector-icons/Ionicons';

import FileAttachmentList from 'app/components/file_attachment_list';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import OptionsContext from 'app/components/options_context';

import PostBodyAdditionalContent from 'app/components/post_body_additional_content';

import {emptyFunction} from 'app/utils/general';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import Reactions from 'app/components/reactions';

export default class PostBody extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            flagPost: PropTypes.func.isRequired,
            unflagPost: PropTypes.func.isRequired,
        }).isRequired,
        canDelete: PropTypes.bool,
        canEdit: PropTypes.bool,
        fileIds: PropTypes.array,
        hasBeenDeleted: PropTypes.bool,
        hasBeenEdited: PropTypes.bool,
        hasReactions: PropTypes.bool,
        isFailed: PropTypes.bool,
        isFlagged: PropTypes.bool,
        isPending: PropTypes.bool,
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
        renderReplyBar: PropTypes.func,
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

    flagPost = () => {
        const {actions, postId} = this.props;
        actions.flagPost(postId);
    };

    unflagPost = () => {
        const {actions, postId} = this.props;
        actions.unflagPost(postId);
    };

    showOptionsContext = (additionalAction) => {
        if (this.refs.options) {
            this.refs.options.show(additionalAction);
        }
    };

    renderFileAttachments() {
        const {
            fileIds,
            isFailed,
            navigator,
            onPress,
            postId,
            toggleSelected,
        } = this.props;

        let attachments;
        if (fileIds.length > 0) {
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

    render() { // eslint-disable-line complexity
        const {formatMessage} = this.context.intl;
        const {
            canDelete,
            canEdit,
            hasBeenDeleted,
            hasBeenEdited,
            hasReactions,
            isFailed,
            isFlagged,
            isPending,
            isPostEphemeral,
            isReplyPost,
            isSearchResult,
            isSystemMessage,
            managedConfig,
            message,
            navigator,
            onFailedPostPress,
            onPermalinkPress,
            onPostDelete,
            onPostEdit,
            onPress,
            postId,
            postProps,
            renderReplyBar,
            theme,
            toggleSelected,
        } = this.props;
        const actions = [];
        const style = getStyleSheet(theme);
        const blockStyles = getMarkdownBlockStyles(theme);
        const textStyles = getMarkdownTextStyles(theme);
        const messageStyle = isSystemMessage ? [style.message, style.systemMessage] : style.message;
        const isPendingOrFailedPost = isPending || isFailed;

        // we should check for the user roles and permissions
        if (!isPendingOrFailedPost && !isSystemMessage && !isPostEphemeral) {
            actions.push({
                text: formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'}),
                onPress: this.props.onAddReaction,
            });

            if (managedConfig.copyAndPasteProtection !== 'true') {
                actions.push({
                    text: formatMessage({id: 'mobile.post_info.copy_post', defaultMessage: 'Copy Post'}),
                    onPress: this.props.onCopyText,
                    copyPost: true,
                });
            }

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
                    <View style={{flexDirection: 'row'}}>
                        <FormattedText
                            style={messageStyle}
                            id='post_body.deleted'
                            defaultMessage='(message deleted)'
                        />
                    </View>
                </TouchableHighlight>
            );
            body = (<View>{messageComponent}</View>);
        } else if (message.length) {
            messageComponent = (
                <View style={{flexDirection: 'row'}}>
                    <View style={[{flex: 1}, (isPendingOrFailedPost && style.pendingPost)]}>
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
                    actions={actions}
                    ref='options'
                    onPress={onPress}
                    toggleSelected={toggleSelected}
                    cancelText={formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'})}
                >
                    {messageComponent}
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
                    {this.renderFileAttachments()}
                    {!isSearchResult && hasReactions &&
                    <Reactions
                        postId={postId}
                        onAddReaction={this.props.onAddReaction}
                    />
                    }
                </OptionsContext>
            );
        }

        return (
            <View style={style.messageContainerWithReplyBar}>
                {renderReplyBar()}
                <View style={{flex: 1, flexDirection: 'row'}}>
                    <View style={{flex: 1}}>
                        {body}
                    </View>
                    {isFailed &&
                    <TouchableOpacity
                        onPress={onFailedPostPress}
                        style={{justifyContent: 'center', marginLeft: 12}}
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
