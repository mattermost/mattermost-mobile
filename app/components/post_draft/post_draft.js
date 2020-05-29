// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, Platform, ScrollView, View} from 'react-native';
import {intlShape} from 'react-intl';
import RNFetchBlob from 'rn-fetch-blob';

import Autocomplete from '@components/autocomplete';
import {paddingHorizontal as padding} from '@components/safe_area_view/iphone_x_spacing';
import {CHANNEL_POST_TEXTBOX_CURSOR_CHANGE, CHANNEL_POST_TEXTBOX_VALUE_CHANGE, IS_REACTION_REGEX, MAX_FILE_COUNT} from '@constants/post_draft';
import {NOTIFY_ALL_MEMBERS} from '@constants/view';
import {General} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {getFormattedFileSize} from '@mm-redux/utils/file_utils';
import EphemeralStore from '@store/ephemeral_store';
import {confirmOutOfOfficeDisabled} from '@utils/status';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Archived from './archived';
import PostInput from './post_input';
import QuickActions from './quick_actions';
import Typing from './typing';
import Uploads from './uploads';

const AUTOCOMPLETE_MARGIN = 20;
const AUTOCOMPLETE_MAX_HEIGHT = 200;

export default class PostDraft extends PureComponent {
    static propTypes = {
        registerTypingAnimation: PropTypes.func.isRequired,
        addReactionToLatestPost: PropTypes.func.isRequired,
        canPost: PropTypes.bool.isRequired,
        channelDisplayName: PropTypes.string,
        channelId: PropTypes.string.isRequired,
        channelIsArchived: PropTypes.bool,
        channelIsReadOnly: PropTypes.bool.isRequired,
        createPost: PropTypes.func.isRequired,
        currentUserId: PropTypes.string.isRequired,
        cursorPositionEvent: PropTypes.string,
        deactivatedChannel: PropTypes.bool.isRequired,
        enableConfirmNotificationsToChannel: PropTypes.bool,
        executeCommand: PropTypes.func.isRequired,
        files: PropTypes.array,
        getChannelTimezones: PropTypes.func.isRequired,
        handleClearFiles: PropTypes.func.isRequired,
        handleClearFailedFiles: PropTypes.func.isRequired,
        initUploadFiles: PropTypes.func.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        isTimezoneEnabled: PropTypes.bool,
        maxMessageLength: PropTypes.number.isRequired,
        maxFileSize: PropTypes.number.isRequired,
        membersCount: PropTypes.number,
        rootId: PropTypes.string,
        screenId: PropTypes.string.isRequired,
        setStatus: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        useChannelMentions: PropTypes.bool.isRequired,
        userIsOutOfOffice: PropTypes.bool.isRequired,
        value: PropTypes.string.isRequired,
        valueEvent: PropTypes.string,
    };

    static defaultProps = {
        canPost: true,
        cursorPositionEvent: CHANNEL_POST_TEXTBOX_CURSOR_CHANGE,
        files: [],
        rootId: '',
        value: '',
        valueEvent: CHANNEL_POST_TEXTBOX_VALUE_CHANGE,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.input = React.createRef();

        this.state = {
            top: 0,
            value: props.value,
            rootId: props.rootId,
            channelId: props.channelId,
            channelTimezoneCount: 0,
        };
    }

    componentDidMount(prevProps) {
        if (this.props.isTimezoneEnabled !== prevProps?.isTimezoneEnabled || prevProps?.channelId !== this.props.channelId) {
            this.numberOfTimezones().then((channelTimezoneCount) => this.setState({channelTimezoneCount}));
        }
    }

    componentDidUpdate(prevProps) {
        if (this.input.current) {
            const {channelId, rootId, value} = this.props;
            const diffChannel = channelId !== prevProps.channelId;
            const diffThread = rootId !== prevProps.rootId;

            if (diffChannel || diffThread) {
                const trimmed = value.trim();
                this.input.current.setValue(trimmed);
                this.updateInitialValue(trimmed);
            }
        }
    }

    blurTextBox = () => {
        if (this.input.current) {
            this.input.current.blur();
        }
    }

    canSend = () => {
        const {files, maxMessageLength} = this.props;
        const value = this.input.current?.getValue() || '';
        const messageLength = value.trim().length;

        if (messageLength > maxMessageLength) {
            return false;
        }

        if (files.length) {
            const loadingComplete = !this.isFileLoading();
            return loadingComplete;
        }

        return messageLength > 0;
    };

    doSubmitMessage = () => {
        if (this.input.current) {
            const {createPost, currentUserId, channelId, files, handleClearFiles, rootId} = this.props;
            const value = this.input.current.getValue() || '';
            const postFiles = files.filter((f) => !f.failed);
            const post = {
                user_id: currentUserId,
                channel_id: channelId,
                root_id: rootId,
                parent_id: rootId,
                message: value.trim(),
            };

            createPost(post, postFiles);

            if (postFiles.length) {
                handleClearFiles(channelId, rootId);
            }

            if (Platform.OS === 'ios') {
                // On iOS, if the PostInput height increases from its
                // initial height (due to a multiline post or a post whose
                // message wraps, for example), then when the text is cleared
                // the PostInput height decrease will be animated. This
                // animation in conjunction with the PostList animation as it
                // receives the newly created post is causing issues in the iOS
                // PostList component as it fails to properly react to its content
                // size changes. While a proper fix is determined for the PostList
                // component, a small delay in triggering the height decrease
                // animation gives the PostList enough time to first handle content
                // size changes from the new post.
                setTimeout(() => {
                    this.input.current.setValue('');
                    this.setState({sendingMessage: false});
                }, 250);
            } else {
                this.input.current.setValue('');
                this.setState({sendingMessage: false});
            }

            this.input.current.changeDraft('');

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
    };

    getStatusFromSlashCommand = (message) => {
        const tokens = message.split(' ');

        if (tokens.length > 0) {
            return tokens[0].substring(1);
        }
        return '';
    };

    handleInputQuickAction = (inputValue) => {
        if (this.input.current) {
            this.input.current.setValue(inputValue, true);
            this.input.current.focus();
        }
    };

    handleLayout = (e) => {
        this.setState({
            top: e.nativeEvent.layout.y,
        });
    };

    handlePasteFiles = (error, files) => {
        if (this.props.screenId === EphemeralStore.getNavigationTopComponentId()) {
            if (error) {
                this.showPasteFilesErrorDialog();
                return;
            }

            const {maxFileSize} = this.props;
            const availableCount = MAX_FILE_COUNT - this.props.files.length;
            if (files.length > availableCount) {
                this.onShowFileMaxWarning();
                return;
            }

            const largeFile = files.find((image) => image.fileSize > maxFileSize);
            if (largeFile) {
                this.onShowFileSizeWarning(largeFile.fileName);
                return;
            }

            this.handleUploadFiles(files);
        }
    };

    handleSendMessage = () => {
        if (!this.isSendButtonEnabled()) {
            return;
        }

        this.setState({sendingMessage: true});

        const {channelId, files, handleClearFailedFiles, rootId} = this.props;
        const value = this.input.current?.getValue() || '';

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
                        handleClearFailedFiles(channelId, rootId);
                        this.sendMessage();
                    },
                }],
            );
        } else {
            this.sendMessage();
        }
    };

    handleUploadFiles = async (files) => {
        const file = files[0];
        if (!file.fileSize | !file.fileName) {
            const path = (file.path || file.uri).replace('file://', '');
            const fileInfo = await RNFetchBlob.fs.stat(path);
            file.fileSize = fileInfo.size;
            file.fileName = fileInfo.filename;
        }

        if (file.fileSize > this.props.maxFileSize) {
            this.onShowFileSizeWarning(file.fileName);
        } else {
            this.props.initUploadFiles(files, this.props.rootId);
        }
    };

    isFileLoading = () => {
        const {files} = this.props;

        return files.some((file) => file.loading);
    };

    isSendButtonEnabled = () => {
        return this.canSend() && !this.isFileLoading() && !this.state.sendingMessage;
    };

    isStatusSlashCommand = (command) => {
        return command === General.ONLINE || command === General.AWAY ||
            command === General.DND || command === General.OFFLINE;
    };

    onShowFileMaxWarning = () => {
        EventEmitter.emit('fileMaxWarning');
    };

    onShowFileSizeWarning = (filename) => {
        const {formatMessage} = this.context.intl;
        const fileSizeWarning = formatMessage({
            id: 'file_upload.fileAbove',
            defaultMessage: 'File above {max} cannot be uploaded: {filename}',
        }, {
            max: getFormattedFileSize({size: this.props.maxFileSize}),
            filename,
        });

        EventEmitter.emit('fileSizeWarning', fileSizeWarning);
        setTimeout(() => {
            EventEmitter.emit('fileSizeWarning', null);
        }, 5000);
    };

    numberOfTimezones = async () => {
        const {channelId, getChannelTimezones} = this.props;
        const {data} = await getChannelTimezones(channelId);
        return data?.length || 0;
    };

    sendCommand = async (msg) => {
        const {intl} = this.context;
        const {channelId, executeCommand, rootId, userIsOutOfOffice} = this.props;

        const status = this.getStatusFromSlashCommand(msg);
        if (userIsOutOfOffice && this.isStatusSlashCommand(status)) {
            confirmOutOfOfficeDisabled(intl, status, this.updateStatus);
            this.setState({sendingMessage: false});
            return;
        }

        const {error} = await executeCommand(msg, channelId, rootId);
        this.setState({sendingMessage: false});

        if (error) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.commands.error_title',
                    defaultMessage: 'Error Executing Command',
                }),
                error.message,
            );
            return;
        }

        if (this.input.current) {
            this.input.current.setValue('');
            this.input.current.changeDraft('');
        }
    };

    sendMessage = () => {
        const value = this.input.current?.getValue() || '';
        const {enableConfirmNotificationsToChannel, membersCount, useChannelMentions} = this.props;
        const notificationsToChannel = enableConfirmNotificationsToChannel && useChannelMentions;
        const toAllOrChannel = this.textContainsAtAllAtChannel(value);

        if (value.indexOf('/') === 0) {
            this.sendCommand(value);
        } else if (notificationsToChannel && membersCount > NOTIFY_ALL_MEMBERS && toAllOrChannel) {
            this.showSendToAllOrChannelAlert(membersCount);
        } else {
            this.doSubmitMessage();
        }
    };

    sendReaction = (emoji) => {
        const {addReactionToLatestPost, rootId} = this.props;
        addReactionToLatestPost(emoji, rootId);

        if (this.input.current) {
            this.input.current.setValue('');
            this.input.current.changeDraft('');
        }

        this.setState({sendingMessage: false});
    };

    showPasteFilesErrorDialog = () => {
        const {formatMessage} = this.context.intl;
        Alert.alert(
            formatMessage({
                id: 'mobile.files_paste.error_title',
                defaultMessage: 'Paste failed',
            }),
            formatMessage({
                id: 'mobile.files_paste.error_description',
                defaultMessage: 'An error occurred while pasting the file(s). Please try again.',
            }),
            [
                {
                    text: formatMessage({
                        id: 'mobile.files_paste.error_dismiss',
                        defaultMessage: 'Dismiss',
                    }),
                },
            ],
        );
    };

    showSendToAllOrChannelAlert = (membersCount) => {
        const {intl} = this.context;
        const {channelTimezoneCount} = this.state;
        const {isTimezoneEnabled} = this.props;

        let notifyAllMessage = '';
        if (isTimezoneEnabled && channelTimezoneCount) {
            notifyAllMessage = (
                intl.formatMessage(
                    {
                        id: 'mobile.post_textbox.entire_channel.message.with_timezones',
                        defaultMessage: 'By using @all or @channel you are about to send notifications to {totalMembers, number} {totalMembers, plural, one {person} other {people}} in {timezones, number} {timezones, plural, one {timezone} other {timezones}}. Are you sure you want to do this?',
                    },
                    {
                        totalMembers: membersCount - 1,
                        timezones: channelTimezoneCount,
                    },
                )
            );
        } else {
            notifyAllMessage = (
                intl.formatMessage(
                    {
                        id: 'mobile.post_textbox.entire_channel.message',
                        defaultMessage: 'By using @all or @channel you are about to send notifications to {totalMembers, number} {totalMembers, plural, one {person} other {people}}. Are you sure you want to do this?',
                    },
                    {
                        totalMembers: membersCount - 1,
                    },
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
    };

    textContainsAtAllAtChannel = (text) => {
        const textWithoutCode = text.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)| *(`{3,}|~{3,})[ .]*(\S+)? *\n([\s\S]*?\s*)\3 *(?:\n+|$)/g, '');
        return (/\B@(all|channel)\b/i).test(textWithoutCode);
    };

    updateInitialValue = (value) => {
        this.setState({value});
    }

    updateStatus = (status) => {
        const {currentUserId, setStatus} = this.props;
        setStatus({
            user_id: currentUserId,
            status,
        });
    };

    render = () => {
        const {channelIsArchived, deactivatedChannel, rootId, theme} = this.props;
        if (channelIsArchived || deactivatedChannel) {
            return (
                <Archived
                    defactivated={deactivatedChannel}
                    rootId={rootId}
                    theme={theme}
                />
            );
        }

        const {
            canPost,
            channelDisplayName,
            channelId,
            channelIsReadOnly,
            cursorPositionEvent,
            isLandscape,
            files,
            maxFileSize,
            maxMessageLength,
            screenId,
            valueEvent,
            registerTypingAnimation,
        } = this.props;
        const style = getStyleSheet(theme);
        const readonly = channelIsReadOnly || !canPost;

        return (
            <>
                <Typing
                    theme={theme}
                    registerTypingAnimation={registerTypingAnimation}
                />
                {Platform.OS === 'android' &&
                <Autocomplete
                    cursorPositionEvent={cursorPositionEvent}
                    maxHeight={Math.min(this.state.top - AUTOCOMPLETE_MARGIN, AUTOCOMPLETE_MAX_HEIGHT)}
                    onChangeText={this.handleInputQuickAction}
                    valueEvent={valueEvent}
                />
                }
                <View
                    style={[style.inputWrapper, padding(isLandscape)]}
                    onLayout={this.handleLayout}
                >
                    <ScrollView
                        style={[style.inputContainer, readonly ? style.readonlyContainer : null]}
                        contentContainerStyle={style.inputContentContainer}
                        keyboardShouldPersistTaps={'always'}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        pinchGestureEnabled={false}
                        overScrollMode={'never'}
                        disableScrollViewPanResponder={true}
                    >
                        <PostInput
                            channelDisplayName={channelDisplayName}
                            channelId={channelId}
                            cursorPositionEvent={cursorPositionEvent}
                            inputEventType={valueEvent}
                            isLandscape={isLandscape}
                            maxMessageLength={maxMessageLength}
                            onPasteFiles={this.handlePasteFiles}
                            onSend={this.handleSendMessage}
                            readonly={readonly}
                            ref={this.input}
                            rootId={rootId}
                            screenId={screenId}
                            theme={theme}
                            updateInitialValue={this.updateInitialValue}
                        />
                        <Uploads
                            files={files}
                            rootId={rootId}
                            theme={theme}
                        />
                        <QuickActions
                            blurTextBox={this.blurTextBox}
                            canSend={this.isSendButtonEnabled()}
                            fileCount={files.length}
                            initialValue={this.state.value}
                            inputEventType={valueEvent}
                            maxFileSize={maxFileSize}
                            onSend={this.handleSendMessage}
                            onShowFileMaxWarning={this.onShowFileMaxWarning}
                            onTextChange={this.handleInputQuickAction}
                            onUploadFiles={this.handleUploadFiles}
                            readonly={readonly}
                            theme={theme}
                        />
                    </ScrollView>
                </View>
            </>
        );
    };
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        inputContainer: {
            flex: 1,
            flexDirection: 'column',
        },
        inputContentContainer: {
            alignItems: 'stretch',
            paddingTop: Platform.select({
                ios: 7,
                android: 0,
            }),
        },
        inputWrapper: {
            alignItems: 'flex-end',
            flexDirection: 'row',
            justifyContent: 'center',
            paddingBottom: 2,
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.20),
        },
        readonlyContainer: {
            marginLeft: 10,
        },
    };
});
