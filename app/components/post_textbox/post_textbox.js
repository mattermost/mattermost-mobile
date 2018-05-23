// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, BackHandler, Keyboard, Platform, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {intlShape} from 'react-intl';
import {RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import AttachmentButton from 'app/components/attachment_button';
import Autocomplete from 'app/components/autocomplete';
import FileUploadPreview from 'app/components/file_upload_preview';
import {INITIAL_HEIGHT, INSERT_TO_COMMENT, INSERT_TO_DRAFT, IS_REACTION_REGEX, MAX_CONTENT_HEIGHT, MAX_FILE_COUNT} from 'app/constants/post_textbox';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import Typing from './components/typing';

let PaperPlane = null;

export default class PostTextbox extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReactionToLatestPost: PropTypes.func.isRequired,
            createPost: PropTypes.func.isRequired,
            executeCommand: PropTypes.func.isRequired,
            handleCommentDraftChanged: PropTypes.func.isRequired,
            handlePostDraftChanged: PropTypes.func.isRequired,
            handleClearFiles: PropTypes.func.isRequired,
            handleClearFailedFiles: PropTypes.func.isRequired,
            handleRemoveLastFile: PropTypes.func.isRequired,
            initUploadFiles: PropTypes.func.isRequired,
            userTyping: PropTypes.func.isRequired,
            handleCommentDraftSelectionChanged: PropTypes.func.isRequired,
        }).isRequired,
        canUploadFiles: PropTypes.bool.isRequired,
        channelId: PropTypes.string.isRequired,
        channelIsLoading: PropTypes.bool,
        channelIsReadOnly: PropTypes.bool.isRequired,
        currentUserId: PropTypes.string.isRequired,
        deactivatedChannel: PropTypes.bool.isRequired,
        files: PropTypes.array,
        maxMessageLength: PropTypes.number.isRequired,
        navigator: PropTypes.object,
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
        uploadFileRequestStatus: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
    };

    static defaultProps = {
        files: [],
        rootId: '',
        value: '',
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.state = {
            contentHeight: INITIAL_HEIGHT,
            cursorPosition: 0,
            keyboardType: 'default',
            value: props.value,
            showFileMaxWarning: false,
        };
    }

    componentDidMount() {
        const event = this.props.rootId ? INSERT_TO_COMMENT : INSERT_TO_DRAFT;
        EventEmitter.on(event, this.handleInsertTextToDraft);
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
            BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.channelId !== this.props.channelId || nextProps.rootId !== this.props.rootId) {
            this.setState({value: nextProps.value});
        }
    }

    componentWillUnmount() {
        const event = this.props.rootId ? INSERT_TO_COMMENT : INSERT_TO_DRAFT;
        EventEmitter.off(event, this.handleInsertTextToDraft);
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
            BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    attachAutocomplete = (c) => {
        this.autocomplete = c;
    };

    blur = () => {
        if (this.refs.input) {
            this.refs.input.blur();
        }
    };

    canSend = () => {
        const {files, maxMessageLength, uploadFileRequestStatus} = this.props;
        const {value} = this.state;
        const valueLength = value.trim().length;

        if (files.length) {
            const filesLoading = [];
            files.forEach((file) => {
                if (file.loading) {
                    filesLoading.push(file);
                }
            });

            const loadingComplete = filesLoading.length === 0;
            return valueLength <= maxMessageLength && uploadFileRequestStatus !== RequestStatus.STARTED && loadingComplete;
        }

        return valueLength > 0 && valueLength <= maxMessageLength;
    };

    changeDraft = (text) => {
        const {
            actions,
            channelId,
            rootId,
        } = this.props;

        if (rootId) {
            actions.handleCommentDraftChanged(rootId, text);
        } else {
            actions.handlePostDraftChanged(channelId, text);
        }
    };

    checkMessageLength = (value) => {
        const {intl} = this.context;
        const {maxMessageLength} = this.props;
        const valueLength = value.trim().length;

        if (valueLength > maxMessageLength) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.message_length.title',
                    defaultMessage: 'Message Length',
                }),
                intl.formatMessage({
                    id: 'mobile.message_length.message',
                    defaultMessage: 'Your current message is too long. Current character count: {max}/{count}',
                }, {
                    max: maxMessageLength,
                    count: valueLength,
                })
            );
        }
    };

    handleAndroidKeyboard = () => {
        this.blur();
    };

    handleAndroidBack = () => {
        const {channelId, files, rootId} = this.props;
        if (files.length) {
            this.props.actions.handleRemoveLastFile(channelId, rootId);
            return true;
        }
        return false;
    };

    handleContentSizeChange = (event) => {
        if (Platform.OS === 'android') {
            let contentHeight = event.nativeEvent.contentSize.height;
            if (contentHeight < INITIAL_HEIGHT) {
                contentHeight = INITIAL_HEIGHT;
            }

            this.setState({
                contentHeight,
            });
        }
    };

    handleEndEditing = (e) => {
        if (e && e.nativeEvent) {
            this.changeDraft(e.nativeEvent.text || '');
        }
    };

    handlePostDraftSelectionChanged = (event) => {
        const cursorPosition = event.nativeEvent.selection.end;
        this.setState({
            cursorPosition,
        });
    };

    handleSendMessage = () => {
        if (!this.canSend()) {
            return;
        }

        const {actions, channelId, files, rootId} = this.props;
        const {value} = this.state;

        const isReactionMatch = value.match(IS_REACTION_REGEX);
        if (isReactionMatch) {
            const emoji = isReactionMatch[2];
            this.sendReaction(emoji);
            return;
        }

        const hasFailedAttachments = files.some((f) => f.failed);
        if (hasFailedAttachments) {
            const {intl} = this.context;

            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.post_textbox.uploadFailedTitle',
                    defaultMessage: 'Attachment failure',
                }),
                intl.formatMessage({
                    id: 'mobile.post_textbox.uploadFailedDesc',
                    defaultMessage: 'Some attachments failed to upload to the server, Are you sure you want to post the message?',
                }),
                [{
                    text: intl.formatMessage({id: 'mobile.channel_info.alertNo', defaultMessage: 'No'}),
                }, {
                    text: intl.formatMessage({id: 'mobile.channel_info.alertYes', defaultMessage: 'Yes'}),
                    onPress: () => {
                        // Remove only failed files
                        actions.handleClearFailedFiles(channelId, rootId);
                        this.sendMessage();
                    },
                }],
            );
        } else {
            this.sendMessage();
        }
    };

    handleInsertTextToDraft = (text) => {
        const {cursorPosition, value} = this.state;

        let completed;
        if (value.length === 0) {
            completed = text;
        } else {
            const firstPart = value.substring(0, cursorPosition);
            const secondPart = value.substring(cursorPosition);
            completed = `${firstPart}${text}${secondPart}`;
        }

        this.setState({
            value: completed,
        });
    }

    handleTextChange = (value) => {
        const {
            actions,
            channelId,
            rootId,
        } = this.props;

        this.checkMessageLength(value);
        this.setState({value});

        if (value) {
            actions.userTyping(channelId, rootId);
        }
    };

    handleUploadFiles = (images) => {
        this.props.actions.initUploadFiles(images, this.props.rootId);
    };

    renderSendButton = () => {
        const {files, theme} = this.props;
        const style = getStyleSheet(theme);

        const canSend = this.canSend();
        const imagesLoading = files.filter((f) => f.loading).length > 0;

        let button = null;

        if (canSend || imagesLoading) {
            if (!PaperPlane) {
                PaperPlane = require('app/components/paper_plane').default;
            }

            const icon = (
                <PaperPlane
                    height={13}
                    width={15}
                    color={theme.buttonColor}
                />
            );

            if (imagesLoading) {
                button = (
                    <View style={style.sendButtonContainer}>
                        <View style={[style.sendButton, style.disableButton]}>
                            {icon}
                        </View>
                    </View>
                );
            } else if (canSend) {
                button = (
                    <TouchableOpacity
                        onPress={this.handleSendMessage}
                        style={style.sendButtonContainer}
                    >
                        <View style={style.sendButton}>
                            {icon}
                        </View>
                    </TouchableOpacity>
                );
            }
        }

        return button;
    };

    sendMessage = () => {
        const {actions, currentUserId, channelId, files, rootId} = this.props;
        const {intl} = this.context;
        const {value} = this.state;

        if (files.length === 0 && !value) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.post_textbox.empty.title',
                    defaultMessage: 'Empty Message',
                }),
                intl.formatMessage({
                    id: 'mobile.post_textbox.empty.message',
                    defaultMessage: 'You are trying to send an empty message.\nPlease make sure you have a message or at least one attached file.',
                }),
                [{
                    text: intl.formatMessage({id: 'mobile.post_textbox.empty.ok', defaultMessage: 'OK'}),
                }],
            );
        } else {
            if (value.indexOf('/') === 0) {
                this.sendCommand(value);
            } else {
                const postFiles = files.filter((f) => !f.failed);
                const post = {
                    user_id: currentUserId,
                    channel_id: channelId,
                    root_id: rootId,
                    parent_id: rootId,
                    message: value,
                };

                actions.createPost(post, postFiles);

                if (postFiles.length) {
                    actions.handleClearFiles(channelId, rootId);
                }
            }

            this.handleTextChange('');
            this.changeDraft('');

            // Shrink the input textbox since the layout events lag slightly
            const nextState = {
                contentHeight: INITIAL_HEIGHT,
            };

            // Fixes the issue where Android predictive text would prepend suggestions to the post draft when messages
            // are typed successively without blurring the input
            let callback;
            if (Platform.OS === 'android') {
                nextState.keyboardType = 'email-address';
                callback = () => this.setState({keyboardType: 'default'});
            }

            this.setState(nextState, callback);
        }
    };

    sendCommand = async (msg) => {
        const {intl} = this.context;
        const {actions, channelId, rootId} = this.props;
        const {error} = await actions.executeCommand(msg, channelId, rootId);

        if (error) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.commands.error_title',
                    defaultMessage: 'Error Executing Command',
                }),
                error.message
            );
        }
    };

    sendReaction = (emoji) => {
        const {actions, rootId} = this.props;
        actions.addReactionToLatestPost(emoji, rootId);
        this.handleTextChange('');
        this.changeDraft('');
    };

    onShowFileMaxWarning = () => {
        this.setState({showFileMaxWarning: true}, () => {
            setTimeout(() => {
                this.setState({showFileMaxWarning: false});
            }, 3000);
        });
    };

    render() {
        const {intl} = this.context;
        const {
            canUploadFiles,
            channelId,
            channelIsLoading,
            channelIsReadOnly,
            deactivatedChannel,
            files,
            navigator,
            rootId,
            theme,
        } = this.props;

        const style = getStyleSheet(theme);
        if (deactivatedChannel) {
            return (
                <Text style={style.deactivatedMessage}>
                    {intl.formatMessage({
                        id: 'create_post.deactivated',
                        defaultMessage: 'You are viewing an archived channel with a deactivated user.',
                    })}
                </Text>
            );
        }

        const {contentHeight, cursorPosition, showFileMaxWarning, value} = this.state;

        const textInputHeight = Math.min(contentHeight, MAX_CONTENT_HEIGHT);
        const textValue = channelIsLoading ? '' : value;

        let placeholder;
        if (channelIsReadOnly) {
            placeholder = {id: 'mobile.create_post.read_only', defaultMessage: 'This channel is read-only.'};
        } else if (rootId) {
            placeholder = {id: 'create_comment.addComment', defaultMessage: 'Add a comment...'};
        } else {
            placeholder = {id: 'create_post.write', defaultMessage: 'Write a message...'};
        }

        let attachmentButton = null;
        const inputContainerStyle = [style.inputContainer];
        if (canUploadFiles) {
            attachmentButton = (
                <AttachmentButton
                    blurTextBox={this.blur}
                    theme={theme}
                    navigator={navigator}
                    fileCount={files.length}
                    maxFileCount={MAX_FILE_COUNT}
                    onShowFileMaxWarning={this.onShowFileMaxWarning}
                    uploadFiles={this.handleUploadFiles}
                />
            );
        } else {
            inputContainerStyle.push(style.inputContainerWithoutFileUpload);
        }

        return (
            <View>
                <Typing/>
                <FileUploadPreview
                    channelId={channelId}
                    files={files}
                    inputHeight={textInputHeight}
                    rootId={rootId}
                    showFileMaxWarning={showFileMaxWarning}
                />
                <Autocomplete
                    ref={this.attachAutocomplete}
                    cursorPosition={cursorPosition}
                    onChangeText={this.handleTextChange}
                    value={this.state.value}
                    rootId={rootId}
                />
                <View style={style.inputWrapper}>
                    {!channelIsReadOnly && attachmentButton}
                    <View style={[inputContainerStyle, (channelIsReadOnly && {marginLeft: 10})]}>
                        <TextInput
                            ref='input'
                            value={textValue}
                            onChangeText={this.handleTextChange}
                            onSelectionChange={this.handlePostDraftSelectionChanged}
                            placeholder={intl.formatMessage(placeholder)}
                            placeholderTextColor={changeOpacity('#000', 0.5)}
                            multiline={true}
                            numberOfLines={5}
                            blurOnSubmit={false}
                            underlineColorAndroid='transparent'
                            style={[style.input, Platform.OS === 'android' ? {height: textInputHeight} : {maxHeight: MAX_CONTENT_HEIGHT}]}
                            onContentSizeChange={this.handleContentSizeChange}
                            keyboardType={this.state.keyboardType}
                            onEndEditing={this.handleEndEditing}
                            disableFullscreenUI={true}
                            editable={!channelIsReadOnly}
                        />
                        {this.renderSendButton()}
                    </View>
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        disableButton: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.3),
        },
        input: {
            color: '#000',
            flex: 1,
            fontSize: 14,
            paddingBottom: 8,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 8,
            textAlignVertical: 'top',
        },
        hidden: {
            position: 'absolute',
            top: 10000, // way off screen
            left: 10000, // way off screen
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            color: 'transparent',
        },
        inputContainer: {
            flex: 1,
            flexDirection: 'row',
            backgroundColor: '#fff',
            alignItems: 'stretch',
            marginRight: 10,
        },
        inputContainerWithoutFileUpload: {
            marginLeft: 10,
        },
        inputWrapper: {
            alignItems: 'flex-end',
            flexDirection: 'row',
            paddingVertical: 4,
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.20),
        },
        deactivatedMessage: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 15,
            lineHeight: 22,
            alignItems: 'flex-end',
            flexDirection: 'row',
            paddingVertical: 4,
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.20),
            marginLeft: 10,
            marginRight: 10,
        },
        sendButtonContainer: {
            justifyContent: 'flex-end',
            paddingHorizontal: 5,
            paddingVertical: 3,
        },
        sendButton: {
            backgroundColor: theme.buttonBg,
            borderRadius: 18,
            height: 28,
            width: 28,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});
