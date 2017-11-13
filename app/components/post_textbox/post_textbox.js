// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, BackHandler, Keyboard, Platform, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import {RequestStatus} from 'mattermost-redux/constants';

import Autocomplete from 'app/components/autocomplete';
import FileUploadPreview from 'app/components/file_upload_preview';
import PaperPlane from 'app/components/paper_plane';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import AttachmentButton from './components/attachment_button';
import Typing from './components/typing';

const INITIAL_HEIGHT = Platform.OS === 'ios' ? 34 : 36;
const MAX_CONTENT_HEIGHT = 100;
const MAX_MESSAGE_LENGTH = 4000;
const IS_REACTION_REGEX = /(^\+:([^:\s]*):)$/i;

class PostTextbox extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReactionToLatestPost: PropTypes.func.isRequired,
            createPost: PropTypes.func.isRequired,
            handleCommentDraftChanged: PropTypes.func.isRequired,
            handlePostDraftChanged: PropTypes.func.isRequired,
            handleClearFiles: PropTypes.func.isRequired,
            handleRemoveLastFile: PropTypes.func.isRequired,
            handleUploadFiles: PropTypes.func.isRequired,
            userTyping: PropTypes.func.isRequired,
            handlePostDraftSelectionChanged: PropTypes.func.isRequired,
            handleCommentDraftSelectionChanged: PropTypes.func.isRequired
        }).isRequired,
        canUploadFiles: PropTypes.bool.isRequired,
        channelId: PropTypes.string.isRequired,
        channelIsLoading: PropTypes.bool.isRequired,
        currentUserId: PropTypes.string.isRequired,
        files: PropTypes.array,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
        uploadFileRequestStatus: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
    };

    static defaultProps = {
        files: [],
        rootId: '',
        value: ''
    };

    constructor(props) {
        super(props);

        this.state = {
            contentHeight: INITIAL_HEIGHT,
            inputWidth: null,
            keyboardType: 'default',
            value: props.value
        };
    }

    componentDidMount() {
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
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
            BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    attachAutocomplete = (c) => {
        this.autocomplete = c;
    };

    blur = () => {
        this.refs.input.blur();
    };

    canSend = () => {
        const {files, uploadFileRequestStatus} = this.props;
        const {value} = this.state;
        const valueLength = value.trim().length;

        if (files.length) {
            return valueLength <= MAX_MESSAGE_LENGTH && uploadFileRequestStatus !== RequestStatus.STARTED && files.filter((f) => !f.failed).length > 0;
        }

        return valueLength > 0 && valueLength <= MAX_MESSAGE_LENGTH;
    };

    changeDraft = (text) => {
        const {
            actions,
            channelId,
            rootId
        } = this.props;

        if (rootId) {
            actions.handleCommentDraftChanged(rootId, text);
        } else {
            actions.handlePostDraftChanged(channelId, text);
        }
    };

    checkMessageLength = (value) => {
        const {intl} = this.props;
        const valueLength = value.trim().length;

        if (valueLength > MAX_MESSAGE_LENGTH) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.message_length.title',
                    defaultMessage: 'Message Length'
                }),
                intl.formatMessage({
                    id: 'mobile.message_length.message',
                    defaultMessage: 'Your current message is too long. Current character count: {max}/{count}'
                }, {
                    max: MAX_MESSAGE_LENGTH,
                    count: valueLength
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

    handleBlur = () => {
        if (this.refs.input && Platform.OS === 'android') {
            this.refs.input.setNativeProps({
                autoScroll: false
            });
        }
    };

    handleContentSizeChange = (event) => {
        let contentHeight = event.nativeEvent.layout.height;
        if (contentHeight < INITIAL_HEIGHT) {
            contentHeight = INITIAL_HEIGHT;
        }

        this.setState({
            contentHeight
        });
    };

    handleEndEditing = (e) => {
        if (e && e.nativeEvent) {
            this.changeDraft(e.nativeEvent.text || '');
        }
    };

    handleFocus = () => {
        if (this.refs.input && Platform.OS === 'android') {
            this.refs.input.setNativeProps({
                autoScroll: true
            });
        }
    };

    handleInputSizeChange = (event) => {
        this.setState({
            inputWidth: event.nativeEvent.layout.width
        });
    };

    handlePostDraftSelectionChanged = (event) => {
        const cursorPosition = event.nativeEvent.selection.end;
        if (this.props.rootId) {
            this.props.actions.handleCommentDraftSelectionChanged(this.props.rootId, cursorPosition);
        } else {
            this.props.actions.handlePostDraftSelectionChanged(this.props.channelId, cursorPosition);
        }

        this.autocomplete.handleSelectionChange(event);
    };

    handleSendMessage = () => {
        if (!this.canSend()) {
            return;
        }

        const {files} = this.props;
        const {value} = this.state;

        const isReactionMatch = value.match(IS_REACTION_REGEX);
        if (isReactionMatch) {
            const emoji = isReactionMatch[2];
            this.sendReaction(emoji);
            return;
        }

        const hasFailedImages = files.some((f) => f.failed);
        if (hasFailedImages) {
            const {intl} = this.props;

            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.post_textbox.uploadFailedTitle',
                    defaultMessage: 'Attachment failure'
                }),
                intl.formatMessage({
                    id: 'mobile.post_textbox.uploadFailedDesc',
                    defaultMessage: 'Some attachments failed to upload to the server, Are you sure you want to post the message?'
                }),
                [{
                    text: intl.formatMessage({id: 'mobile.channel_info.alertNo', defaultMessage: 'No'})
                }, {
                    text: intl.formatMessage({id: 'mobile.channel_info.alertYes', defaultMessage: 'Yes'}),
                    onPress: this.sendMessage
                }],
            );
        } else {
            this.sendMessage();
        }
    };

    handleTextChange = (value) => {
        const {
            actions,
            channelId,
            rootId
        } = this.props;

        this.checkMessageLength(value);
        this.setState({value});

        if (value) {
            actions.userTyping(channelId, rootId);
        }
    };

    handleUploadFiles = (images) => {
        this.props.actions.handleUploadFiles(images, this.props.rootId);
    };

    renderDisabledSendButton = () => {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.sendButtonContainer}>
                <View style={[style.sendButton, style.disableButton]}>
                    <PaperPlane
                        height={13}
                        width={15}
                        color={theme.buttonColor}
                    />
                </View>
            </View>
        );
    };

    renderSendButton = () => {
        const {theme, uploadFileRequestStatus} = this.props;
        const style = getStyleSheet(theme);

        if (uploadFileRequestStatus === RequestStatus.STARTED) {
            return this.renderDisabledSendButton();
        } else if (this.canSend()) {
            return (
                <TouchableOpacity
                    onPress={this.handleSendMessage}
                    style={style.sendButtonContainer}
                >
                    <View style={style.sendButton}>
                        <PaperPlane
                            height={13}
                            width={15}
                            color={theme.buttonColor}
                        />
                    </View>
                </TouchableOpacity>
            );
        }

        return null;
    };

    sendMessage = () => {
        const {actions, currentUserId, channelId, files, rootId} = this.props;
        const {value} = this.state;

        const postFiles = files.filter((f) => !f.failed);
        const post = {
            user_id: currentUserId,
            channel_id: channelId,
            root_id: rootId,
            parent_id: rootId,
            message: value
        };

        actions.createPost(post, postFiles);
        this.handleTextChange('');
        this.changeDraft('');
        if (postFiles.length) {
            actions.handleClearFiles(channelId, rootId);
        }

        // Shrink the input textbox since the layout events lag slightly
        const nextState = {
            contentHeight: INITIAL_HEIGHT
        };

        // Fixes the issue where Android predictive text would prepend suggestions to the post draft when messages
        // are typed successively without blurring the input
        let callback;
        if (Platform.OS === 'android') {
            nextState.keyboardType = 'email-address';
            callback = () => this.setState({keyboardType: 'default'});
        }

        this.setState(nextState, callback);
    };

    sendReaction = (emoji) => {
        const {actions, rootId} = this.props;
        actions.addReactionToLatestPost(emoji, rootId);
        this.handleTextChange('');
        this.changeDraft('');
    };

    render() {
        const {
            canUploadFiles,
            channelIsLoading,
            intl,
            theme
        } = this.props;

        const style = getStyleSheet(theme);
        const textInputHeight = Math.min(this.state.contentHeight, MAX_CONTENT_HEIGHT);

        const textValue = channelIsLoading ? '' : this.state.value;

        let placeholder;
        if (this.props.rootId) {
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
                    navigator={this.props.navigator}
                    uploadFiles={this.handleUploadFiles}
                />
            );
        } else {
            inputContainerStyle.push(style.inputContainerWithoutFileUpload);
        }

        return (
            <View>
                <Text
                    style={[style.input, style.hidden, {width: this.state.inputWidth}]}
                    onLayout={this.handleContentSizeChange}
                >
                    {textValue + ' '}
                </Text>
                <Typing/>
                <FileUploadPreview
                    channelId={this.props.channelId}
                    files={this.props.files}
                    inputHeight={textInputHeight}
                    rootId={this.props.rootId}
                />
                <Autocomplete
                    ref={this.attachAutocomplete}
                    onChangeText={this.handleTextChange}
                    value={this.state.value}
                />
                <View style={style.inputWrapper}>
                    {attachmentButton}
                    <View style={inputContainerStyle}>
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
                            style={[style.input, {height: textInputHeight}]}
                            onLayout={this.handleInputSizeChange}
                            keyboardType={this.state.keyboardType}
                            onFocus={this.handleFocus}
                            onBlur={this.handleBlur}
                            onEndEditing={this.handleEndEditing}
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
            backgroundColor: changeOpacity(theme.buttonBg, 0.3)
        },
        input: {
            color: '#000',
            flex: 1,
            fontSize: 14,
            paddingBottom: 8,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 8,
            textAlignVertical: 'top'
        },
        hidden: {
            position: 'absolute',
            top: 10000, // way off screen
            left: 10000, // way off screen
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            color: 'transparent'
        },
        inputContainer: {
            flex: 1,
            flexDirection: 'row',
            backgroundColor: '#fff',
            alignItems: 'flex-end'
        },
        inputContainerWithoutFileUpload: {
            marginLeft: 10
        },
        inputWrapper: {
            alignItems: 'flex-end',
            flexDirection: 'row',
            paddingVertical: 4,
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.20)
        },
        sendButtonContainer: {
            paddingRight: 10
        },
        sendButton: {
            backgroundColor: theme.buttonBg,
            borderRadius: 18,
            marginRight: 5,
            height: 28,
            width: 28,
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: 2,
            ...Platform.select({
                ios: {
                    marginBottom: 3
                },
                android: {
                    height: 29,
                    marginBottom: 4,
                    width: 29
                }
            })
        }
    };
});

export default injectIntl(PostTextbox, {withRef: true});
