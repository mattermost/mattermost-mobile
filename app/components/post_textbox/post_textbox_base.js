// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    AppState,
    BackHandler,
    findNodeHandle,
    Keyboard,
    NativeModules,
    Platform,
    Text,
    TextInput,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import Button from 'react-native-button';
import {General, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getFormattedFileSize} from 'mattermost-redux/utils/file_utils';

import AttachmentButton from 'app/components/attachment_button';
import Fade from 'app/components/fade';
import FormattedMarkdownText from 'app/components/formatted_markdown_text';
import FormattedText from 'app/components/formatted_text';
import SendButton from 'app/components/send_button';

import {INSERT_TO_COMMENT, INSERT_TO_DRAFT, IS_REACTION_REGEX, MAX_CONTENT_HEIGHT, MAX_FILE_COUNT} from 'app/constants/post_textbox';
import {NOTIFY_ALL_MEMBERS} from 'app/constants/view';
import {t} from 'app/utils/i18n';
import {confirmOutOfOfficeDisabled} from 'app/utils/status';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from 'app/utils/theme';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

const {RNTextInputReset} = NativeModules;

export default class PostTextBoxBase extends PureComponent {
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
            getChannelTimezones: PropTypes.func.isRequired,
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
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
        uploadFileRequestStatus: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
        userIsOutOfOffice: PropTypes.bool.isRequired,
        channelIsArchived: PropTypes.bool,
        onCloseChannel: PropTypes.func,
        cursorPositionEvent: PropTypes.string,
        valueEvent: PropTypes.string,
        currentChannelMembersCount: PropTypes.number,
        enableConfirmNotificationsToChannel: PropTypes.bool,
        isTimezoneEnabled: PropTypes.bool,
        currentChannel: PropTypes.object,
        isLandscape: PropTypes.bool.isRequired,
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

        this.input = React.createRef();

        this.state = {
            cursorPosition: 0,
            keyboardType: 'default',
            top: 0,
            value: props.value,
            channelTimezoneCount: 0,
        };
    }

    componentDidMount(prevProps) {
        const event = this.props.rootId ? INSERT_TO_COMMENT : INSERT_TO_DRAFT;

        EventEmitter.on(event, this.handleInsertTextToDraft);
        AppState.addEventListener('change', this.handleAppStateChange);

        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
            BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
        }

        if (this.props.isTimezoneEnabled !== prevProps?.isTimezoneEnabled || prevProps?.channelId !== this.props.channelId) {
            this.numberOfTimezones().then((channelTimezoneCount) => this.setState({channelTimezoneCount}));
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
        AppState.removeEventListener('change', this.handleAppStateChange);

        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
            BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    blur = () => {
        if (this.input.current) {
            this.input.current.blur();
        }
    };

    numberOfTimezones = async () => {
        const {data} = await this.props.actions.getChannelTimezones(this.props.channelId);
        return data?.length || 0;
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

    getAttachmentButton = () => {
        const {canUploadFiles, channelIsReadOnly, files, maxFileSize, theme} = this.props;
        let attachmentButton = null;

        if (canUploadFiles && !channelIsReadOnly) {
            attachmentButton = (
                <AttachmentButton
                    blurTextBox={this.blur}
                    theme={theme}
                    fileCount={files.length}
                    maxFileSize={maxFileSize}
                    maxFileCount={MAX_FILE_COUNT}
                    onShowFileMaxWarning={this.onShowFileMaxWarning}
                    onShowFileSizeWarning={this.onShowFileSizeWarning}
                    uploadFiles={this.handleUploadFiles}
                />
            );
        }

        return attachmentButton;
    };

    getInputContainerStyle = () => {
        const {canUploadFiles, channelIsReadOnly, theme} = this.props;
        const style = getStyleSheet(theme);
        const inputContainerStyle = [style.inputContainer];

        if (!canUploadFiles) {
            inputContainerStyle.push(style.inputContainerWithoutFileUpload);
        }

        if (channelIsReadOnly) {
            inputContainerStyle.push(style.readonlyContainer);
        }

        return inputContainerStyle;
    };

    getPlaceHolder = () => {
        const {channelIsReadOnly, rootId} = this.props;
        let placeholder;

        if (channelIsReadOnly) {
            placeholder = {id: t('mobile.create_post.read_only'), defaultMessage: 'This channel is read-only.'};
        } else if (rootId) {
            placeholder = {id: t('create_comment.addComment'), defaultMessage: 'Add a comment...'};
        } else {
            placeholder = {id: t('create_post.write'), defaultMessage: 'Write to {channelDisplayName}'};
        }

        return placeholder;
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

    handleAppStateChange = (nextAppState) => {
        if (nextAppState !== 'active') {
            this.changeDraft(this.state.value);
        }
    };

    handleEndEditing = (e) => {
        if (e && e.nativeEvent) {
            this.changeDraft(e.nativeEvent.text || '');
        }
    };

    handlePostDraftSelectionChanged = (event) => {
        const cursorPosition = event.nativeEvent.selection.end;
        const {cursorPositionEvent} = this.props;

        if (cursorPositionEvent) {
            EventEmitter.emit(cursorPositionEvent, cursorPosition);
        }

        this.setState({
            cursorPosition,
        });
    };

    handleSendMessage = () => {
        if (!this.isSendButtonEnabled()) {
            return;
        }

        this.setState({sendingMessage: true});

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
                    onPress: () => {
                        this.setState({sendingMessage: false});
                    },
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
    };

    handleTextChange = (value, autocomplete = false) => {
        const {
            actions,
            channelId,
            rootId,
            cursorPositionEvent,
            valueEvent,
        } = this.props;

        if (valueEvent) {
            EventEmitter.emit(valueEvent, value);
        }

        const nextState = {value};

        // Workaround for some Android keyboards that don't play well with cursors (e.g. Samsung keyboards)
        if (autocomplete && this.input?.current) {
            if (Platform.OS === 'android') {
                RNTextInputReset.resetKeyboardInput(findNodeHandle(this.input.current));
            } else {
                nextState.cursorPosition = value.length;
                if (cursorPositionEvent) {
                    EventEmitter.emit(cursorPositionEvent, nextState.cursorPosition);
                }
            }
        }

        this.checkMessageLength(value);

        this.setState(nextState);

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

    isSendButtonEnabled() {
        return this.canSend() && !this.isFileLoading() && !this.state.sendingMessage;
    }

    sendMessage = () => {
        const {value} = this.state;

        const currentMembersCount = this.props.currentChannelMembersCount;
        const notificationsToChannel = this.props.enableConfirmNotificationsToChannel;
        const toAllOrChannel = this.textContainsAtAllAtChannel(value);

        if (value.indexOf('/') === 0) {
            this.sendCommand(value);
        } else if (notificationsToChannel && currentMembersCount > NOTIFY_ALL_MEMBERS && toAllOrChannel) {
            this.showSendToAllOrChannelAlert(currentMembersCount);
        } else {
            this.doSubmitMessage();
        }
    };

    textContainsAtAllAtChannel = (text) => {
        const textWithoutCode = text.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)| *(`{3,}|~{3,})[ .]*(\S+)? *\n([\s\S]*?\s*)\3 *(?:\n+|$)/g, '');
        return (/\B@(all|channel)\b/i).test(textWithoutCode);
    }

    showSendToAllOrChannelAlert = (currentMembersCount) => {
        const {intl} = this.context;
        const {channelTimezoneCount} = this.state;
        const {isTimezoneEnabled} = this.props;

        let notifyAllMessage = '';
        if (isTimezoneEnabled && channelTimezoneCount) {
            notifyAllMessage = (
                intl.formatMessage(
                    {
                        id: 'mobile.post_textbox.entire_channel.message.with_timezones',
                        defaultMessage: 'By using @all or @channel you are about to send notifications to {totalMembers} people in {timezones, number} {timezones, plural, one {timezone} other {timezones}}. Are you sure you want to do this?',
                    },
                    {
                        totalMembers: currentMembersCount - 1,
                        timezones: channelTimezoneCount,
                    }
                )
            );
        } else {
            notifyAllMessage = (
                intl.formatMessage(
                    {
                        id: 'mobile.post_textbox.entire_channel.message',
                        defaultMessage: 'By using @all or @channel you are about to send notifications to {totalMembers} people. Are you sure you want to do this?',
                    },
                    {
                        totalMembers: currentMembersCount - 1,
                    }
                )
            );
        }

        Alert.alert(
            intl.formatMessage({
                id: 'mobile.post_textbox.entire_channel.title',
                defaultMessage: 'Confirm sending notifications to entire channel',
            }),
            notifyAllMessage,
            [
                {
                    text: intl.formatMessage({
                        id: 'mobile.post_textbox.entire_channel.cancel',
                        defaultMessage: 'Cancel',
                    }),
                    onPress: () => {
                        this.setState({sendingMessage: false});
                    },
                },
                {
                    text: intl.formatMessage({
                        id: 'mobile.post_textbox.entire_channel.confirm',
                        defaultMessage: 'Confirm',
                    }),
                    onPress: () => this.doSubmitMessage(),
                },
            ],
        );
    }

    doSubmitMessage = () => {
        const {actions, currentUserId, channelId, files, rootId} = this.props;
        const {value} = this.state;
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
                this.setState({sendingMessage: false});
            }, 250);
        } else {
            this.handleTextChange('');
            this.setState({sendingMessage: false});
        }

        this.changeDraft('');

        let callback;
        if (Platform.OS === 'android') {
            // Fixes the issue where Android predictive text would prepend suggestions to the post draft when messages
            // are typed successively without blurring the input
            const nextState = {
                keyboardType: 'email-address',
            };

            callback = () => this.setState({keyboardType: 'default'});

            this.setState(nextState, callback);
        }

        EventEmitter.emit('scroll-to-bottom');
    }

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
            this.setState({sendingMessage: false});
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

        this.handleTextChange('');
        this.changeDraft('');

        this.setState({sendingMessage: false});
    };

    sendReaction = (emoji) => {
        const {actions, rootId} = this.props;
        actions.addReactionToLatestPost(emoji, rootId);

        this.handleTextChange('');
        this.changeDraft('');

        this.setState({sendingMessage: false});
    };

    onShowFileMaxWarning = () => {
        EventEmitter.emit('fileMaxWarning');
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

        EventEmitter.emit('fileSizeWarning', fileSizeWarning);
        setTimeout(() => {
            EventEmitter.emit('fileSizeWarning', null);
        }, 3000);
    };

    onCloseChannelPress = () => {
        const {onCloseChannel, channelTeamId} = this.props;
        this.props.actions.selectPenultimateChannel(channelTeamId);
        if (onCloseChannel) {
            onCloseChannel();
        }
    };

    archivedView = (theme, style) => {
        return (
            <View style={style.archivedWrapper}>
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
            </View>
        );
    };

    handleLayout = (e) => {
        this.setState({
            top: e.nativeEvent.layout.y,
        });
    };

    renderDeactivatedChannel = () => {
        const {intl} = this.context;
        const style = getStyleSheet(this.props.theme);

        return (
            <Text style={style.deactivatedMessage}>
                {intl.formatMessage({
                    id: 'create_post.deactivated',
                    defaultMessage: 'You are viewing an archived channel with a deactivated user.',
                })}
            </Text>
        );
    }

    renderTextBox = () => {
        const {intl} = this.context;
        const {channelDisplayName, channelIsArchived, channelIsLoading, channelIsReadOnly, theme, isLandscape} = this.props;
        const style = getStyleSheet(theme);

        if (channelIsArchived) {
            return this.archivedView(theme, style);
        }

        const {value} = this.state;
        const textValue = channelIsLoading ? '' : value;
        const placeholder = this.getPlaceHolder();

        return (
            <View
                style={[style.inputWrapper, padding(isLandscape)]}
                onLayout={this.handleLayout}
            >
                {this.getAttachmentButton()}
                <View style={this.getInputContainerStyle()}>
                    <TextInput
                        ref={this.input}
                        value={textValue}
                        onChangeText={this.handleTextChange}
                        onSelectionChange={this.handlePostDraftSelectionChanged}
                        placeholder={intl.formatMessage(placeholder, {channelDisplayName})}
                        placeholderTextColor={changeOpacity('#000', 0.5)}
                        multiline={true}
                        blurOnSubmit={false}
                        underlineColorAndroid='transparent'
                        style={style.input}
                        keyboardType={this.state.keyboardType}
                        onEndEditing={this.handleEndEditing}
                        disableFullscreenUI={true}
                        editable={!channelIsReadOnly}
                        keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    />
                    <Fade visible={this.isSendButtonVisible()}>
                        <SendButton
                            disabled={!this.isSendButtonEnabled()}
                            handleSendMessage={this.handleSendMessage}
                            theme={theme}
                        />
                    </Fade>
                </View>
            </View>
        );
    };
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        input: {
            color: '#000',
            flex: 1,
            fontSize: 14,
            maxHeight: MAX_CONTENT_HEIGHT,
            paddingBottom: 8,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 8,
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
        readonlyContainer: {
            marginLeft: 10,
        },
    };
});
