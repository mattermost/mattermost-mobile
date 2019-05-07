// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, BackHandler, findNodeHandle, Keyboard, NativeModules, Platform, Text, TextInput, View} from 'react-native';
import {intlShape} from 'react-intl';
import Button from 'react-native-button';
import {General, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getFormattedFileSize} from 'mattermost-redux/utils/file_utils';

import AttachmentButton from 'app/components/attachment_button';
import Autocomplete from 'app/components/autocomplete';
import Fade from 'app/components/fade';
import FileUploadPreview from 'app/components/file_upload_preview';
import {INITIAL_HEIGHT, INSERT_TO_COMMENT, INSERT_TO_DRAFT, IS_REACTION_REGEX, MAX_CONTENT_HEIGHT, MAX_FILE_COUNT} from 'app/constants/post_textbox';
import {confirmOutOfOfficeDisabled} from 'app/utils/status';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';
import FormattedMarkdownText from 'app/components/formatted_markdown_text';
import FormattedText from 'app/components/formatted_text';
import SendButton from 'app/components/send_button';

import Typing from './components/typing';

const {RNTextInputReset} = NativeModules;

const AUTOCOMPLETE_MARGIN = 20;
const AUTOCOMPLETE_MAX_HEIGHT = 200;

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
            setStatus: PropTypes.func.isRequired,
            selectPenultimateChannel: PropTypes.func.isRequired,
        }).isRequired,
        canUploadFiles: PropTypes.bool.isRequired,
        channelId: PropTypes.string.isRequired,
        channelDisplayName: PropTypes.string,
        channelTeamId: PropTypes.string.isRequired,
        channelIsLoading: PropTypes.bool,
        channelIsReadOnly: PropTypes.bool.isRequired,
        currentUserId: PropTypes.string.isRequired,
        deactivatedChannel: PropTypes.bool.isRequired,
        files: PropTypes.array,
        maxFileSize: PropTypes.number.isRequired,
        maxMessageLength: PropTypes.number.isRequired,
        navigator: PropTypes.object,
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
        uploadFileRequestStatus: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
        userIsOutOfOffice: PropTypes.bool.isRequired,
        channelIsArchived: PropTypes.bool,
        onCloseChannel: PropTypes.func,
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
            fileSizeWarning: null,
            top: 0,
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

    blur = () => {
        if (this.refs.input) {
            this.refs.input.blur();
        }
    };

    canSend = () => {
        const {files, maxMessageLength, uploadFileRequestStatus} = this.props;
        const {value} = this.state;
        const messageLength = value.trim().length;

        if (messageLength > maxMessageLength) {
            return false;
        }

        if (files.length) {
            const loadingComplete = !this.isFileLoading();
            const alreadySendingFiles = uploadFileRequestStatus === RequestStatus.STARTED;
            return loadingComplete && !alreadySendingFiles;
        }

        return messageLength > 0;
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
                    defaultMessage: 'Some attachments failed to upload to the server. Are you sure you want to post the message?',
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

    handleTextChange = (value, autocomplete = false) => {
        const {
            actions,
            channelId,
            rootId,
        } = this.props;

        // Workaround for some Android keyboards that don't play well with cursors (e.g. Samsung keyboards)
        if (autocomplete && Platform.OS === 'android') {
            RNTextInputReset.resetKeyboardInput(findNodeHandle(this.refs.input));
        }

        this.checkMessageLength(value);
        this.setState({value});

        if (value) {
            actions.userTyping(channelId, rootId);
        }
    };

    handleUploadFiles = (images) => {
        this.props.actions.initUploadFiles(images, this.props.rootId);
    };

    isFileLoading() {
        const {files} = this.props;

        return files.some((file) => file.loading);
    }

    isSendButtonVisible() {
        return this.canSend() || this.isFileLoading();
    }

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

            if (Platform.OS === 'ios') {
                // On iOS, if the PostTextbox height increases from its
                // initial height (due to a multiline post or a post whose
                // message wraps, for example), then when the text is cleared
                // the PostTextbox height decrease will be animated. This
                // animation in conjunction with the PostList animation as it
                // receives the newly created post is causing issues in the iOS
                // PostList component as it fails to properly react to its content
                // size changes. While a proper fix is determined for the PostList
                // component, a small delay in triggering the height decrease
                // animation gives the PostList enough time to first handle content
                // size changes from the new post.
                setTimeout(() => {
                    this.handleTextChange('');
                }, 250);
            } else {
                this.handleTextChange('');
            }

            this.changeDraft('');

            let callback;
            if (Platform.OS === 'android') {
                // Shrink the input textbox since the layout events lag slightly
                const nextState = {
                    contentHeight: INITIAL_HEIGHT,
                };

                // Fixes the issue where Android predictive text would prepend suggestions to the post draft when messages
                // are typed successively without blurring the input
                nextState.keyboardType = 'email-address';
                callback = () => this.setState({keyboardType: 'default'});

                this.setState(nextState, callback);
            }

            EventEmitter.emit('scroll-to-bottom');
        }
    };

    getStatusFromSlashCommand = (message) => {
        const tokens = message.split(' ');

        if (tokens.length > 0) {
            return tokens[0].substring(1);
        }
        return '';
    };

    isStatusSlashCommand = (command) => {
        return command === General.ONLINE || command === General.AWAY ||
            command === General.DND || command === General.OFFLINE;
    };

    updateStatus = (status) => {
        const {actions, currentUserId} = this.props;
        actions.setStatus({
            user_id: currentUserId,
            status,
        });
    };

    sendCommand = async (msg) => {
        const {intl} = this.context;
        const {userIsOutOfOffice, actions, channelId, rootId} = this.props;

        const status = this.getStatusFromSlashCommand(msg);
        if (userIsOutOfOffice && this.isStatusSlashCommand(status)) {
            confirmOutOfOfficeDisabled(intl, status, this.updateStatus);
            return;
        }

        const {error} = await actions.executeCommand(msg, channelId, rootId);

        if (error) {
            this.handleTextChange(msg);
            this.changeDraft(msg);
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

    onShowFileSizeWarning = (filename) => {
        const {formatMessage} = this.context.intl;
        const fileSizeWarning = formatMessage({
            id: 'file_upload.fileAbove',
            defaultMessage: 'File above {max}MB cannot be uploaded: {filename}',
        }, {
            max: getFormattedFileSize({size: this.props.maxFileSize}),
            filename,
        });

        this.setState({fileSizeWarning}, () => {
            setTimeout(() => {
                this.setState({fileSizeWarning: null});
            }, 3000);
        });
    };

    onCloseChannelPress = () => {
        const {onCloseChannel, channelTeamId} = this.props;
        this.props.actions.selectPenultimateChannel(channelTeamId);
        if (onCloseChannel) {
            onCloseChannel();
        }
    };

    archivedView = (theme, style) => {
        return (<View style={style.archivedWrapper}>
            <FormattedMarkdownText
                id='archivedChannelMessage'
                defaultMessage='You are viewing an **archived channel**. New messages cannot be posted.'
                theme={theme}
                style={style.archivedText}
            />
            <Button
                containerStyle={style.closeButton}
                onPress={this.onCloseChannelPress}
            >
                <FormattedText
                    id='center_panel.archived.closeChannel'
                    defaultMessage='Close Channel'
                    style={style.closeButtonText}
                />
            </Button>
        </View>);
    };

    handleLayout = (e) => {
        this.setState({
            top: e.nativeEvent.layout.y,
        });
    };

    render() {
        const {intl} = this.context;
        const {
            canUploadFiles,
            channelId,
            channelDisplayName,
            channelIsLoading,
            channelIsReadOnly,
            deactivatedChannel,
            files,
            maxFileSize,
            navigator,
            rootId,
            theme,
            channelIsArchived,
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

        const {
            contentHeight,
            cursorPosition,
            fileSizeWarning,
            showFileMaxWarning,
            top,
            value,
        } = this.state;

        const textInputHeight = Math.min(contentHeight, MAX_CONTENT_HEIGHT);
        const textValue = channelIsLoading ? '' : value;

        let placeholder;
        if (channelIsReadOnly) {
            placeholder = {id: t('mobile.create_post.read_only'), defaultMessage: 'This channel is read-only.'};
        } else if (rootId) {
            placeholder = {id: t('create_comment.addComment'), defaultMessage: 'Add a comment...'};
        } else {
            placeholder = {id: t('create_post.write'), defaultMessage: 'Write to {channelDisplayName}'};
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
                    maxFileSize={maxFileSize}
                    maxFileCount={MAX_FILE_COUNT}
                    onShowFileMaxWarning={this.onShowFileMaxWarning}
                    onShowFileSizeWarning={this.onShowFileSizeWarning}
                    uploadFiles={this.handleUploadFiles}
                />
            );
        } else {
            inputContainerStyle.push(style.inputContainerWithoutFileUpload);
        }

        return (
            <React.Fragment>
                <Typing/>
                <FileUploadPreview
                    channelId={channelId}
                    files={files}
                    fileSizeWarning={fileSizeWarning}
                    rootId={rootId}
                    showFileMaxWarning={showFileMaxWarning}
                />
                <Autocomplete
                    cursorPosition={cursorPosition}
                    maxHeight={Math.min(top - AUTOCOMPLETE_MARGIN, AUTOCOMPLETE_MAX_HEIGHT)}
                    onChangeText={this.handleTextChange}
                    value={this.state.value}
                    rootId={rootId}
                />
                {!channelIsArchived && (
                    <View
                        style={style.inputWrapper}
                        onLayout={this.handleLayout}
                    >
                        {!channelIsReadOnly && attachmentButton}
                        <View style={[inputContainerStyle, (channelIsReadOnly && {marginLeft: 10})]}>
                            <TextInput
                                ref='input'
                                value={textValue}
                                onChangeText={this.handleTextChange}
                                onSelectionChange={this.handlePostDraftSelectionChanged}
                                placeholder={intl.formatMessage(placeholder, {channelDisplayName})}
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
                            <Fade visible={this.isSendButtonVisible()}>
                                <SendButton
                                    disabled={this.isFileLoading()}
                                    handleSendMessage={this.handleSendMessage}
                                    theme={theme}
                                />
                            </Fade>
                        </View>
                    </View>
                )}
                {channelIsArchived && this.archivedView(theme, style)}
            </React.Fragment>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
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
        archivedWrapper: {
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 10,
            paddingBottom: 10,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.20),
        },
        archivedText: {
            textAlign: 'center',
            color: theme.centerChannelColor,
        },
        closeButton: {
            backgroundColor: theme.buttonBg,
            alignItems: 'center',
            paddingTop: 5,
            paddingBottom: 5,
            borderRadius: 4,
            marginTop: 10,
            height: 40,
        },
        closeButtonText: {
            marginTop: 7,
            color: 'white',
            fontWeight: 'bold',
        },
    };
});
