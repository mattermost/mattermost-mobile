// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import FileAttachmentList from 'app/components/file_attachment_list';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import OptionsContext from 'app/components/options_context';
import SlackAttachments from 'app/components/slack_attachments';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class PostMessage extends PureComponent {
    static propTypes = {
        attachments: PropTypes.array,
        canDelete: PropTypes.bool,
        canEdit: PropTypes.bool,
        fileIds: PropTypes.array,
        hasBeenDeleted: PropTypes.bool,
        intl: PropTypes.object.isRequired,
        isFlagged: PropTypes.bool,
        isPendingOrFailedPost: PropTypes.bool,
        isSystemMessage: PropTypes.bool,
        flagPost: PropTypes.func,
        message: PropTypes.string,
        navigator: PropTypes.object.isRequired,
        onFailedPostPress: PropTypes.func,
        onPostDelete: PropTypes.func,
        onPostEdit: PropTypes.func,
        onPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        renderReplyBar: PropTypes.func,
        showReplyBar: PropTypes.bool,
        theme: PropTypes.object,
        toggleSelected: PropTypes.func,
        unflagPost: PropTypes.func
    };

    static defaultProps = {
        fileIds: [],
        flagPost: () => true,
        onFailedPostPress: () => true,
        onPostDelete: () => true,
        onPostEdit: () => true,
        onPress: () => true,
        renderReplyBar: () => true,
        toggleSelected: () => true,
        unflagPost: () => true
    };

    hideOptionsContext = () => {
        if (Platform.OS === 'ios') {
            this.refs.options.hide();
        }
    };

    showOptionsContext = () => {
        return this.refs.options.show();
    };

    renderFileAttachments() {
        const {
            fileIds,
            isPendingOrFailedPost,
            navigator,
            onPress,
            postId,
            toggleSelected
        } = this.props;

        let attachments;
        if (fileIds.length > 0) {
            attachments = (
                <FileAttachmentList
                    fileIds={fileIds}
                    hideOptionsContext={this.hideOptionsContext}
                    isPendingOrFailedPost={isPendingOrFailedPost}
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

    renderSlackAttachments = (baseStyle, blockStyles, textStyles) => {
        const {attachments, navigator, theme} = this.props;

        if (attachments && attachments.length) {
            return (
                <SlackAttachments
                    attachments={attachments}
                    baseTextStyle={baseStyle}
                    blockStyles={blockStyles}
                    navigator={navigator}
                    textStyles={textStyles}
                    theme={theme}
                />
            );
        }

        return null;
    };

    render() {
        const {
            canDelete,
            canEdit,
            hasBeenDeleted,
            isFlagged,
            isPendingOrFailedPost,
            isSystemMessage,
            intl,
            flagPost,
            message,
            navigator,
            onFailedPostPress,
            onPostDelete,
            onPostEdit,
            onPress,
            renderReplyBar,
            showReplyBar,
            theme,
            toggleSelected,
            unflagPost
        } = this.props;
        const {formatMessage} = intl;
        const actions = [];
        const style = getStyleSheet(theme);
        const blockStyles = getMarkdownBlockStyles(theme);
        const textStyles = getMarkdownTextStyles(theme);
        const messageStyle = isSystemMessage ? [style.message, style.systemMessage] : style.message;

        // we should check for the user roles and permissions
        if (!isPendingOrFailedPost) {
            if (isFlagged) {
                actions.push({
                    text: formatMessage({id: 'post_info.mobile.unflag', defaultMessage: 'Unflag'}),
                    onPress: unflagPost
                });
            } else {
                actions.push({
                    text: formatMessage({id: 'post_info.mobile.flag', defaultMessage: 'Flag'}),
                    onPress: flagPost
                });
            }

            if (canEdit) {
                actions.push({text: formatMessage({id: 'post_info.edit', defaultMessage: 'Edit'}), onPress: onPostEdit});
            }

            if (canDelete && !hasBeenDeleted) {
                actions.push({text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}), onPress: onPostDelete});
            }
        }

        let messageComponent;
        if (hasBeenDeleted) {
            messageComponent = (
                <FormattedText
                    style={messageStyle}
                    id='post_body.deleted'
                    defaultMessage='(message deleted)'
                />
            );
        } else if (message.length) {
            messageComponent = (
                <View style={{flexDirection: 'row'}}>
                    <View style={[{flex: 1}, (isPendingOrFailedPost && style.pendingPost)]}>
                        <Markdown
                            baseTextStyle={messageStyle}
                            textStyles={textStyles}
                            blockStyles={blockStyles}
                            value={message}
                            onLongPress={this.showOptionsContext}
                            navigator={navigator}
                        />
                    </View>
                </View>
            );
        }

        return (
            <View style={style.messageContainerWithReplyBar}>
                {showReplyBar && renderReplyBar()}
                <View style={{flex: 1, flexDirection: 'row'}}>
                    <View style={{flex: 1}}>
                        <OptionsContext
                            actions={actions}
                            ref='options'
                            onLongPress={this.showOptionsContext}
                            onPress={onPress}
                            toggleSelected={toggleSelected}
                            cancelText={formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'})}
                        >
                            {messageComponent}
                            {this.renderSlackAttachments(messageStyle, blockStyles, textStyles)}
                            {this.renderFileAttachments()}
                        </OptionsContext>
                    </View>
                    {isPendingOrFailedPost &&
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
    return StyleSheet.create({
        message: {
            color: theme.centerChannelColor,
            fontSize: 15
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row',
            flex: 1
        },
        pendingPost: {
            opacity: 0.5
        },
        systemMessage: {
            opacity: 0.6
        }
    });
});
