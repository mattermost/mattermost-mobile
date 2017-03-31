// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    BackAndroid,
    Keyboard,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
    Text
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ImagePicker from 'react-native-image-crop-picker';
import {RequestStatus} from 'mattermost-redux/constants';

import Autocomplete from 'app/components/autocomplete';
import FileUploadPreview from 'app/components/file_upload_preview';
import FormattedText from 'app/components/formatted_text';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import PaperPlane from 'app/components/paper_plane';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const MAX_CONTENT_HEIGHT = 100;

export default class PostTextbox extends PureComponent {
    static propTypes = {
        channelIsLoading: PropTypes.bool.isRequired,
        currentUserId: PropTypes.string.isRequired,
        typing: PropTypes.array.isRequired,
        teamId: PropTypes.string.isRequired,
        channelId: PropTypes.string.isRequired,
        files: PropTypes.array,
        rootId: PropTypes.string,
        value: PropTypes.string.isRequired,
        onChangeText: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        uploadFileRequestStatus: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            closeModal: PropTypes.func.isRequired,
            createPost: PropTypes.func.isRequired,
            handleRemoveLastFile: PropTypes.func.isRequired,
            handleUploadFiles: PropTypes.func.isRequired,
            showOptionsModal: PropTypes.func.isRequired,
            userTyping: PropTypes.func.isRequired
        }).isRequired
    };

    static defaultProps = {
        rootId: '',
        files: [],
        value: '',
        onSelectionChange: () => true
    };

    constructor(props) {
        super(props);

        this.state = {
            canSend: false,
            contentHeight: Platform.select({
                ios: 34,
                android: 34
            })
        };
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
            BackAndroid.addEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    componentWillReceiveProps(nextProps) {
        const canSend = (nextProps.value.trim().length > 0 || nextProps.files.length > 0) && nextProps.uploadFileRequestStatus !== RequestStatus.STARTED;
        this.setState({
            canSend
        });
    }

    componentWillUnmount() {
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
            BackAndroid.removeEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    blur = () => {
        this.refs.input.getWrappedInstance().blur();
    };

    handleContentSizeChange = (e) => {
        this.setState({
            contentHeight: e.nativeEvent.contentSize.height
        });
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

    sendMessage = () => {
        if (!this.state.canSend) {
            return;
        }

        const post = {
            user_id: this.props.currentUserId,
            channel_id: this.props.channelId,
            root_id: this.props.rootId,
            parent_id: this.props.rootId,
            message: this.props.value
        };

        this.props.actions.createPost(this.props.teamId, post, this.props.files);
        this.handleTextChange('');
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

    attachAutocomplete = (c) => {
        this.autocomplete = c;
    };

    attachFileFromCamera = async () => {
        try {
            this.props.actions.closeModal();
            const image = await ImagePicker.openCamera({
                compressImageQuality: 0.5
            });

            this.uploadFiles([image]);
        } catch (error) {
            // If user cancels it's considered
            // an error and we have to catch it.
        }
    }

    attachFileFromLibrary = async () => {
        try {
            this.props.actions.closeModal();
            const images = await ImagePicker.openPicker({
                multiple: true,
                compressImageQuality: 0.5
            });

            this.uploadFiles(images);
        } catch (error) {
            // If user cancels it's considered
            // an error and we have to catch it.
        }
    }

    uploadFiles = (images) => {
        this.props.actions.handleUploadFiles(images, this.props.rootId);
    }

    showFileAttachmentOptions = () => {
        this.blur();
        const options = {
            items: [{
                action: this.attachFileFromCamera,
                text: {
                    id: 'mobile.file_upload.camera',
                    defaultMessage: 'Take Photo or Video'
                },
                icon: 'camera'
            }, {
                action: this.attachFileFromLibrary,
                text: {
                    id: 'mobile.file_upload.library',
                    defaultMessage: 'Photo Library'
                },
                icon: 'photo'
            }]
        };

        this.props.actions.showOptionsModal(options);
    }

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

    render() {
        const {channelIsLoading, theme, value} = this.props;

        const style = getStyleSheet(theme);
        const textInputHeight = Math.min(this.state.contentHeight, MAX_CONTENT_HEIGHT);

        const textValue = channelIsLoading ? '' : value;

        let placeholder;
        if (this.props.rootId) {
            placeholder = {id: 'create_comment.addComment', defaultMessage: 'Add a comment...'};
        } else {
            placeholder = {id: 'create_post.write', defaultMessage: 'Write a message...'};
        }

        return (
            <View>
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
                <View style={{backgroundColor: theme.centerChannelBg}}>
                    <View
                        style={style.inputWrapper}
                    >
                        <TouchableOpacity
                            onPress={this.showFileAttachmentOptions}
                            style={style.buttonContainer}
                        >
                            <Icon
                                size={30}
                                style={{marginTop: 2}}
                                color={changeOpacity(theme.centerChannelColor, 0.9)}
                                name='md-add'
                            />
                        </TouchableOpacity>
                        <View style={style.inputContainer}>
                            <TextInputWithLocalizedPlaceholder
                                ref='input'
                                value={textValue}
                                onChangeText={this.handleTextChange}
                                onSelectionChange={this.handleSelectionChange}
                                onContentSizeChange={this.handleContentSizeChange}
                                placeholder={placeholder}
                                placeholderTextColor={changeOpacity('#000', 0.5)}
                                onSubmitEditing={this.sendMessage}
                                multiline={true}
                                underlineColorAndroid='transparent'
                                style={[style.input, {height: Math.min(this.state.contentHeight, MAX_CONTENT_HEIGHT)}]}
                            />
                            {this.state.canSend &&
                                <TouchableOpacity
                                    onPress={this.sendMessage}
                                    style={style.sendButton}
                                >
                                    <PaperPlane
                                        height={13}
                                        width={15}
                                        color={theme.buttonColor}
                                    />
                                </TouchableOpacity>
                            }
                        </View>
                    </View>
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        buttonContainer: {
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center'
        },
        input: {
            color: '#000',
            flex: 1,
            fontSize: 14,
            paddingBottom: 8,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 6
        },
        inputContainer: {
            flex: 1,
            flexDirection: 'row',
            backgroundColor: '#fff',
            alignItems: 'flex-end',
            marginRight: 4
        },
        inputWrapper: {
            alignItems: 'flex-end',
            flexDirection: 'row',
            paddingVertical: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.05),
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.20)
        },
        sendButton: {
            backgroundColor: theme.buttonBg,
            borderRadius: 18,
            marginRight: 5,
            height: 26,
            width: 26,
            ...Platform.select({
                ios: {
                    marginBottom: 5
                },
                android: {
                    marginBottom: 3.5
                }
            }),
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: 2
        },
        typing: {
            paddingLeft: 10,
            fontSize: 11,
            marginBottom: 5,
            color: theme.centerChannelColor,
            backgroundColor: 'transparent'
        }
    });
});
