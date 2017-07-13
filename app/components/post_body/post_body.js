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
import {injectIntl, intlShape} from 'react-intl';
import Icon from 'react-native-vector-icons/Ionicons';

import FileAttachmentList from 'app/components/file_attachment_list';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import OptionsContext from 'app/components/options_context';
import SlackAttachments from 'app/components/slack_attachments';

import {emptyFunction} from 'app/utils/general';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

class PostBody extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            flagPost: PropTypes.func.isRequired,
            unflagPost: PropTypes.func.isRequired
        }).isRequired,
        attachments: PropTypes.array,
        canDelete: PropTypes.bool,
        canEdit: PropTypes.bool,
        fileIds: PropTypes.array,
        hasBeenDeleted: PropTypes.bool,
        intl: intlShape.isRequired,
        isFailed: PropTypes.bool,
        isFlagged: PropTypes.bool,
        isPending: PropTypes.bool,
        isSystemMessage: PropTypes.bool,
        message: PropTypes.string,
        navigator: PropTypes.object.isRequired,
        onFailedPostPress: PropTypes.func,
        onPostDelete: PropTypes.func,
        onPostEdit: PropTypes.func,
        onPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        renderReplyBar: PropTypes.func,
        theme: PropTypes.object,
        toggleSelected: PropTypes.func
    };

    static defaultProps = {
        fileIds: [],
        onFailedPostPress: emptyFunction,
        onPostDelete: emptyFunction,
        onPostEdit: emptyFunction,
        onPress: emptyFunction,
        renderReplyBar: emptyFunction,
        toggleSelected: emptyFunction
    };

    hideOptionsContext = () => {
        if (Platform.OS === 'ios') {
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

    showOptionsContext = () => {
        return this.refs.options.show();
    };

    renderFileAttachments() {
        const {
            fileIds,
            isFailed,
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
            isFailed,
            isFlagged,
            isPending,
            isSystemMessage,
            intl,
            message,
            navigator,
            onFailedPostPress,
            onPostDelete,
            onPostEdit,
            onPress,
            renderReplyBar,
            theme,
            toggleSelected
        } = this.props;
        const {formatMessage} = intl;
        const actions = [];
        const style = getStyleSheet(theme);
        const blockStyles = getMarkdownBlockStyles(theme);
        const textStyles = getMarkdownTextStyles(theme);
        const messageStyle = isSystemMessage ? [style.message, style.systemMessage] : style.message;
        const isPendingOrFailedPost = isPending || isFailed;

        // we should check for the user roles and permissions
        if (!isPendingOrFailedPost) {
            if (isFlagged) {
                actions.push({
                    text: formatMessage({id: 'post_info.mobile.unflag', defaultMessage: 'Unflag'}),
                    onPress: this.unflagPost
                });
            } else {
                actions.push({
                    text: formatMessage({id: 'post_info.mobile.flag', defaultMessage: 'Flag'}),
                    onPress: this.flagPost
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
                {renderReplyBar()}
                <View style={{flex: 1, flexDirection: 'row'}}>
                    <View style={{flex: 1}}>
                        <OptionsContext
                            actions={actions}
                            ref='options'
                            onPress={onPress}
                            toggleSelected={toggleSelected}
                            cancelText={formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'})}
                        >
                            {messageComponent}
                            {this.renderSlackAttachments(messageStyle, blockStyles, textStyles)}
                            {this.renderFileAttachments()}
                        </OptionsContext>
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

export default injectIntl(PostBody);
