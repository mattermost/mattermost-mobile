// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    BackHandler,
    Keyboard,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ImagePicker from 'react-native-image-picker';
import {injectIntl, intlShape} from 'react-intl';
import {RequestStatus} from 'mattermost-redux/constants';

import Autocomplete from 'app/components/autocomplete';
import FileUploadPreview from 'app/components/file_upload_preview';
import FormattedText from 'app/components/formatted_text';
import PaperPlane from 'app/components/paper_plane';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const INITIAL_HEIGHT = Platform.OS === 'ios' ? 34 : 36;
const MAX_CONTENT_HEIGHT = 100;
const MAX_MESSAGE_LENGTH = 4000;

class PostTextbox extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            createPost: PropTypes.func.isRequired,
            handleClearFiles: PropTypes.func.isRequired,
            handleRemoveLastFile: PropTypes.func.isRequired,
            handleUploadFiles: PropTypes.func.isRequired,
            userTyping: PropTypes.func.isRequired
        }).isRequired,
        canUploadFiles: PropTypes.bool.isRequired,
        channelId: PropTypes.string.isRequired,
        channelIsLoading: PropTypes.bool.isRequired,
        currentUserId: PropTypes.string.isRequired,
        files: PropTypes.array,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        onChangeText: PropTypes.func.isRequired,
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
        typing: PropTypes.array.isRequired,
        uploadFileRequestStatus: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
    };

    static defaultProps = {
        files: [],
        onSelectionChange: () => true,
        rootId: '',
        value: ''
    };

    constructor(props) {
        super(props);

        this.state = {
            contentHeight: INITIAL_HEIGHT,
            inputWidth: null
        };
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
            BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    componentWillReceiveProps(nextProps) {
        const {intl} = this.props;
        const {value} = nextProps;
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
    }

    componentWillUnmount() {
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
            BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    blur = () => {
        this.refs.input.blur();
    };

    canSend = () => {
        const {files, uploadFileRequestStatus, value} = this.props;
        const valueLength = value.trim().length;

        if (files.length) {
            return valueLength <= MAX_MESSAGE_LENGTH && uploadFileRequestStatus !== RequestStatus.STARTED && files.filter((f) => !f.failed).length > 0;
        }

        return valueLength > 0 && valueLength <= MAX_MESSAGE_LENGTH;
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

    handleSendMessage = () => {
        if (!this.canSend()) {
            return;
        }

        const hasFailedImages = this.props.files.some((f) => f.failed);
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

    sendMessage = () => {
        const files = this.props.files.filter((f) => !f.failed);
        const post = {
            user_id: this.props.currentUserId,
            channel_id: this.props.channelId,
            root_id: this.props.rootId,
            parent_id: this.props.rootId,
            message: this.props.value
        };

        this.props.actions.createPost(post, files);
        this.handleTextChange('');
        if (this.props.files.length) {
            this.props.actions.handleClearFiles(this.props.channelId, this.props.rootId);
        }

        // Shrink the input textbox since the layout events lag slightly
        this.setState({
            contentHeight: INITIAL_HEIGHT
        });
    };

    handleTextChange = (text) => {
        const {
            onChangeText,
            channelId,
            rootId,
            actions
        } = this.props;

        onChangeText(text);
        actions.userTyping(channelId, rootId);
    };

    handleSelectionChange = (event) => {
        if (this.autocomplete) {
            this.autocomplete.handleSelectionChange(event);
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

    handleInputSizeChange = (event) => {
        this.setState({
            inputWidth: event.nativeEvent.layout.width
        });
    };

    handleSubmit = () => {
        // Workaround for android as the multiline is not working
        if (Platform.OS === 'android') {
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            this.timeout = setTimeout(() => {
                let {value: msg} = this.props;
                msg += '\n';
                this.handleTextChange(msg);
            }, 10);
        }
    };

    attachAutocomplete = (c) => {
        this.autocomplete = c;
    };

    attachFileFromCamera = () => {
        const options = {
            quality: 0.7,
            noData: true,
            storageOptions: {
                cameraRoll: true,
                waitUntilSaved: true
            }
        };

        ImagePicker.launchCamera(options, (response) => {
            if (response.error || response.didCancel) {
                return;
            }

            this.uploadFiles([response]);
        });
    };

    attachFileFromLibrary = () => {
        const options = {
            quality: 0.7,
            noData: true
        };

        if (Platform.OS === 'ios') {
            options.mediaType = 'mixed';
        }

        ImagePicker.launchImageLibrary(options, (response) => {
            if (response.error || response.didCancel) {
                return;
            }

            this.uploadFiles([response]);
        });
    };

    attachVideoFromLibraryAndroid = () => {
        const options = {
            quality: 0.7,
            mediaType: 'video',
            noData: true
        };

        ImagePicker.launchImageLibrary(options, (response) => {
            if (response.error || response.didCancel) {
                return;
            }

            this.uploadFiles([response]);
        });
    }

    uploadFiles = (images) => {
        this.props.actions.handleUploadFiles(images, this.props.rootId);
    };

    handleFileAttachmentOption = (action) => {
        this.props.navigator.dismissModal({
            animationType: 'none'
        });

        // Have to wait to launch the library attachment action.
        // If we call the action after dismissModal with no delay then the
        // Wix navigator will dismiss the library attachment modal as well.
        setTimeout(() => {
            if (typeof action === 'function') {
                action();
            }
        }, 100);
    }

    showFileAttachmentOptions = () => {
        this.blur();
        const options = {
            items: [{
                action: () => this.handleFileAttachmentOption(this.attachFileFromCamera),
                text: {
                    id: 'mobile.file_upload.camera',
                    defaultMessage: 'Take Photo or Video'
                },
                icon: 'camera'
            }, {
                action: () => this.handleFileAttachmentOption(this.attachFileFromLibrary),
                text: {
                    id: 'mobile.file_upload.library',
                    defaultMessage: 'Photo Library'
                },
                icon: 'photo'
            }]
        };

        if (Platform.OS === 'android') {
            options.items.push({
                action: () => this.handleFileAttachmentOption(this.attachVideoFromLibraryAndroid),
                text: {
                    id: 'mobile.file_upload.video',
                    defaultMessage: 'Video Library'
                },
                icon: 'file-video-o'
            });
        }

        this.props.navigator.showModal({
            screen: 'OptionsModal',
            title: '',
            animationType: 'none',
            passProps: {
                items: options.items
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext'
            }
        });
    };

    renderTyping = () => {
        const {typing} = this.props;
        const numUsers = typing.length;

        switch (numUsers) {
        case 0:
            return null;
        case 1:
            return (
                <FormattedText
                    id='msg_typing.isTyping'
                    defaultMessage='{user} is typing...'
                    values={{
                        user: typing[0]
                    }}
                />
            );
        default: {
            const last = typing.pop();
            return (
                <FormattedText
                    id='msg_typing.areTyping'
                    defaultMessage='{users} and {last} are typing...'
                    values={{
                        users: (typing.join(', ')),
                        last
                    }}
                />
            );
        }
        }
    };

    renderDisabledSendButton = () => {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={[style.sendButton, style.disableButton]}>
                <PaperPlane
                    height={13}
                    width={15}
                    color={theme.buttonColor}
                />
            </View>
        );
    }

    renderSendButton = () => {
        const {theme, uploadFileRequestStatus} = this.props;
        const style = getStyleSheet(theme);

        if (uploadFileRequestStatus === RequestStatus.STARTED) {
            return this.renderDisabledSendButton();
        } else if (this.canSend()) {
            return (
                <TouchableOpacity
                    onPress={this.handleSendMessage}
                    style={style.sendButton}
                >
                    <PaperPlane
                        height={13}
                        width={15}
                        color={theme.buttonColor}
                    />
                </TouchableOpacity>
            );
        }

        return null;
    }

    render() {
        const {
            canUploadFiles,
            channelIsLoading,
            intl,
            theme,
            value
        } = this.props;

        const style = getStyleSheet(theme);
        const textInputHeight = Math.min(this.state.contentHeight, MAX_CONTENT_HEIGHT);

        const textValue = channelIsLoading ? '' : value;

        let placeholder;
        if (this.props.rootId) {
            placeholder = {id: 'create_comment.addComment', defaultMessage: 'Add a comment...'};
        } else {
            placeholder = {id: 'create_post.write', defaultMessage: 'Write a message...'};
        }

        let fileUpload = null;
        const inputContainerStyle = [style.inputContainer];
        if (canUploadFiles) {
            fileUpload = (
                <TouchableOpacity
                    onPress={this.showFileAttachmentOptions}
                    style={style.buttonContainer}
                >
                    <Icon
                        size={30}
                        style={style.attachIcon}
                        color={changeOpacity(theme.centerChannelColor, 0.9)}
                        name='md-add'
                    />
                </TouchableOpacity>
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
                <View>
                    <Text
                        style={[style.typing]}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        {this.renderTyping()}
                    </Text>
                </View>
                <FileUploadPreview
                    channelId={this.props.channelId}
                    files={this.props.files}
                    inputHeight={textInputHeight}
                    rootId={this.props.rootId}
                />
                <Autocomplete
                    ref={this.attachAutocomplete}
                    onChangeText={this.props.onChangeText}
                    rootId={this.props.rootId}
                />
                <View style={style.inputWrapper}>
                    {fileUpload}
                    <View style={inputContainerStyle}>
                        <TextInput
                            ref='input'
                            value={textValue}
                            onChangeText={this.handleTextChange}
                            onSelectionChange={this.handleSelectionChange}
                            placeholder={intl.formatMessage(placeholder)}
                            placeholderTextColor={changeOpacity('#000', 0.5)}
                            multiline={true}
                            numberOfLines={10}
                            blurOnSubmit={false}
                            underlineColorAndroid='transparent'
                            style={[style.input, {height: textInputHeight}]}
                            onSubmitEditing={this.handleSubmit}
                            onLayout={this.handleInputSizeChange}
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
        buttonContainer: {
            height: Platform.select({
                ios: 34,
                android: 36
            }),
            width: 45,
            alignItems: 'center',
            justifyContent: 'center'
        },
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
            alignItems: 'flex-end',
            marginRight: 10
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
        attachIcon: {
            marginTop: Platform.select({
                ios: 2,
                android: 0
            })
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
        },
        typing: {
            paddingLeft: 10,
            fontSize: 11,
            marginBottom: 5,
            color: theme.centerChannelColor,
            backgroundColor: 'transparent'
        }
    };
});

export default injectIntl(PostTextbox, {withRef: true});
