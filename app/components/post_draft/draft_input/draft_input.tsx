// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, type LayoutChangeEvent, type NativeSyntheticEvent, Platform, ScrollView, type TextInputSelectionChangeEventData, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import DaakiaInput from '@components/daakia_components/daakia_input';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {EMOJI_PICKER} from '@constants/screens';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {usePersistentNotificationProps} from '@hooks/persistent_notification_props';
import {openAsBottomSheet} from '@screens/navigation';
import {getEmojiByName} from '@utils/emoji/helpers';
import {persistentNotificationsConfirmation} from '@utils/post';
import {makeStyleSheetFromTheme} from '@utils/theme';

import CameraQuickAction from '../quick_actions/camera_quick_action';
import EmojiQuickAction from '../quick_actions/emoji_quick_action';
import FileQuickAction from '../quick_actions/file_quick_action';
import ImageQuickAction from '../quick_actions/image_quick_action';
import InputQuickAction from '../quick_actions/input_quick_action';
import PostPriorityAction from '../quick_actions/post_priority_action';
import SendAction from '../send_button';
import Typing from '../typing';
import Uploads from '../uploads';

import Header from './header';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';

export type Props = {
    testID?: string;
    channelId: string;
    channelType?: ChannelType;
    channelName?: string;
    rootId?: string;
    currentUserId: string;
    canShowPostPriority?: boolean;

    // Post Props
    postPriority: PostPriority;
    updatePostPriority: (postPriority: PostPriority) => void;
    persistentNotificationInterval: number;
    persistentNotificationMaxRecipients: number;

    // Cursor Position Handler
    cursorPosition: number;
    updateCursorPosition: React.Dispatch<React.SetStateAction<number>>;

    // Send Handler
    sendMessage: (schedulingInfo?: SchedulingInfo) => Promise<void | {data?: boolean; error?: unknown}>;
    canSend: boolean;

    // Draft Handler
    files: FileInfo[];
    value: string;
    uploadFileError: React.ReactNode;
    updateValue: React.Dispatch<React.SetStateAction<string>>;
    addFiles: (files: FileInfo[]) => void;
    updatePostInputTop: (top: number) => void;
    setIsFocused: (isFocused: boolean) => void;
    scheduledPostsEnabled: boolean;
    canUploadFiles?: boolean;
    canShowSlashCommands?: boolean;
}

const SAFE_AREA_VIEW_EDGES: Edge[] = ['left', 'right'];

const SCHEDULED_POST_PICKER_BUTTON = 'close-scheduled-post-picker';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        actionsContainer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingBottom: Platform.select({
                ios: 6,
                android: 8,
            }),
            paddingTop: 2,
        },
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
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 10,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 0,
            borderBottomWidth: 0,

            // borderColor: changeOpacity(theme.centerChannelColor, 0.20),

            // borderTopLeftRadius: 12,
            // borderTopRightRadius: 12,
        },
        inputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            gap: 8,
        },
        plusButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.buttonBg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        plusActionsContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 8,
            gap: 12,
            backgroundColor: theme.centerChannelBg,
        },
        hiddenAction: {
            width: 0,
            height: 0,
            opacity: 0,
            overflow: 'hidden',
        },
        cameraButton: {
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
        },
        postPriorityLabel: {
            marginLeft: 12,
            marginTop: Platform.select({
                ios: 3,
                android: 10,
            }),
        },
    };
});

function DraftInput({
    testID,
    channelId,
    channelType,
    channelName,
    currentUserId,
    canShowPostPriority,
    files,
    rootId = '',
    value,
    uploadFileError,
    sendMessage,
    canSend,
    updateValue,
    addFiles,
    updatePostInputTop,
    postPriority,
    updatePostPriority,
    persistentNotificationInterval,
    persistentNotificationMaxRecipients,
    setIsFocused,
    scheduledPostsEnabled,
    canUploadFiles = true,
    canShowSlashCommands = true,
    cursorPosition,
    updateCursorPosition,
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const [showPlusActions, setShowPlusActions] = useState(false);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        updatePostInputTop(e.nativeEvent.layout.height);
    }, [updatePostInputTop]);

    const togglePlusActions = useCallback(() => {
        setShowPlusActions((prev) => !prev);
    }, []);

    const inputRef = useRef<PasteInputRef>();
    const focus = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const handleEmojiPress = useCallback((emojiName: string) => {
        const emojiData = getEmojiByName(emojiName, []);
        let emojiChar: string;

        if (emojiData?.image && emojiData.category !== 'custom') {
            const codeArray: string[] = emojiData.image.split('-');
            emojiChar = codeArray.reduce((acc, c) => {
                return acc + String.fromCodePoint(parseInt(c, 16));
            }, '');
        } else {
            emojiChar = `:${emojiName}:`;
        }

        const beforeCursor = value.substring(0, cursorPosition);
        const afterCursor = value.substring(cursorPosition);
        const newValue = `${beforeCursor}${emojiChar}${afterCursor}`;
        const newCursorPosition = cursorPosition + emojiChar.length;

        updateValue(newValue);
        updateCursorPosition(newCursorPosition);
        focus();
    }, [value, cursorPosition, updateValue, updateCursorPosition, focus]);

    const onEmojiButtonPress = useCallback(() => {
        openAsBottomSheet({
            closeButtonId: 'close-emoji-picker',
            screen: EMOJI_PICKER,
            theme,
            title: intl.formatMessage({id: 'emoji_picker.default', defaultMessage: 'Emoji'}),
            props: {
                onEmojiPress: handleEmojiPress,
            },
        });
    }, [theme, intl, handleEmojiPress]);

    // Render
    const postInputTestID = `${testID}.post.input`;
    const sendActionTestID = `${testID}.send_action`;
    const style = getStyleSheet(theme);

    const {persistentNotificationsEnabled, noMentionsError, mentionsList} = usePersistentNotificationProps({
        value,
        channelType,
        postPriority,
    });

    const handleSendMessage = useCallback(async (schedulingInfoParam?: SchedulingInfo) => {
        const schedulingInfo = (schedulingInfoParam && 'scheduled_at' in schedulingInfoParam) ? schedulingInfoParam : undefined;

        if (persistentNotificationsEnabled) {
            const sendMessageWithScheduledPost = () => sendMessage(schedulingInfo);
            await persistentNotificationsConfirmation(serverUrl, value, mentionsList, intl, sendMessageWithScheduledPost, persistentNotificationMaxRecipients, persistentNotificationInterval, currentUserId, channelName, channelType);
            return Promise.resolve();
        }
        return sendMessage(schedulingInfo);
    }, [persistentNotificationsEnabled, serverUrl, value, mentionsList, intl, sendMessage, persistentNotificationMaxRecipients, persistentNotificationInterval, currentUserId, channelName, channelType]);

    const handleShowScheduledPostOptions = useCallback(() => {
        if (!scheduledPostsEnabled) {
            return;
        }

        Keyboard.dismiss();
        const title = isTablet ? intl.formatMessage({id: 'scheduled_post.picker.title', defaultMessage: 'Schedule draft'}) : '';

        openAsBottomSheet({
            closeButtonId: SCHEDULED_POST_PICKER_BUTTON,
            screen: Screens.SCHEDULED_POST_OPTIONS,
            theme,
            title,
            props: {
                closeButtonId: SCHEDULED_POST_PICKER_BUTTON,
                onSchedule: handleSendMessage,
            },
        });
    }, [handleSendMessage, intl, isTablet, scheduledPostsEnabled, theme]);

    const sendActionDisabled = !canSend || noMentionsError;

    // Hardware keyboard: Enter to send, Shift+Enter for newline
    const onHardwareEnter = useCallback(() => {
        if (!sendActionDisabled) {
            handleSendMessage();
        }
    }, [handleSendMessage, sendActionDisabled]);

    const onHardwareShiftEnter = useCallback(() => {
        let newValue: string;
        updateValue((v) => {
            newValue = v.substring(0, cursorPosition) + '\n' + v.substring(cursorPosition);
            return newValue;
        });
        updateCursorPosition((pos) => pos + 1);
    }, [cursorPosition, updateCursorPosition, updateValue]);

    const hardwareEvents = useMemo(() => ({
        onEnterPressed: onHardwareEnter,
        onShiftEnterPressed: onHardwareShiftEnter,
    }), [onHardwareEnter, onHardwareShiftEnter]);

    useHardwareKeyboardEvents(hardwareEvents);

    return (
        <>
            <Typing
                channelId={channelId}
                rootId={rootId}
            />
            <SafeAreaView
                edges={SAFE_AREA_VIEW_EDGES}
                onLayout={handleLayout}
                style={style.inputWrapper}
                testID={testID}
            >

                <ScrollView
                    style={style.inputContainer}
                    contentContainerStyle={style.inputContentContainer}
                    keyboardShouldPersistTaps={'always'}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    pinchGestureEnabled={false}
                    overScrollMode={'never'}
                    disableScrollViewPanResponder={true}
                >
                    <Header
                        noMentionsError={noMentionsError}
                        postPriority={postPriority}
                    />
                    <View style={style.inputRow}>
                        {/* Plus Icon on Left */}
                        <TouchableWithFeedback
                            testID={`${testID}.plus_button`}
                            onPress={togglePlusActions}
                            style={style.plusButton}
                            type='opacity'
                        >
                            <CompassIcon
                                name={showPlusActions ? 'close' : 'plus'}
                                color={theme.buttonColor}
                                size={20}
                            />
                        </TouchableWithFeedback>

                        {/* Text Field with Emoji Inside */}
                        <View style={{flex: 1}}>
                            <DaakiaInput
                                testID={postInputTestID}
                                value={value}
                                onChangeText={(text: string) => {
                                    updateValue(text);

                                    // Update cursor position immediately when text changes
                                    // This ensures @ mention autocomplete works correctly
                                    updateCursorPosition(text.length);
                                }}
                                onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
                                    updateCursorPosition(e.nativeEvent.selection.end);
                                }}
                                placeholder='Type a message'
                                inputRef={inputRef}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onEmojiPress={onEmojiButtonPress}
                            />
                        </View>

                        {/* Camera Icon or Send Button on Right - based on text input or files */}
                        {value.trim().length > 0 || files.length > 0 ? (
                            <SendAction
                                testID={sendActionTestID}
                                disabled={sendActionDisabled}
                                sendMessage={handleSendMessage}
                                showScheduledPostOptions={handleShowScheduledPostOptions}
                                scheduledPostEnabled={scheduledPostsEnabled}
                            />
                        ) : (
                            <CameraQuickAction
                                testID={`${testID}.camera_action`}
                                disabled={!canUploadFiles}
                                fileCount={files.length}
                                maxFileCount={10}
                                maxFilesReached={files.length >= 10}
                                onUploadFiles={addFiles}
                            />
                        )}
                    </View>
                    <Uploads
                        currentUserId={currentUserId}
                        files={files}
                        uploadFileError={uploadFileError}
                        channelId={channelId}
                        rootId={rootId}
                    />
                    {/* Plus Actions Row - Shows below text field when expanded */}
                    {showPlusActions && (
                        <View style={style.plusActionsContainer}>
                            <View style={style.hiddenAction}>
                                <InputQuickAction
                                    testID={`${testID}.at_input_action`}
                                    disabled={value[value.length - 1] === '@'}
                                    inputType='at'
                                    updateValue={updateValue}
                                    focus={focus}
                                />
                            </View>
                            {canShowSlashCommands && (
                                <InputQuickAction
                                    testID={`${testID}.slash_input_action`}
                                    disabled={value.length > 0}
                                    inputType='slash'
                                    updateValue={updateValue}
                                    focus={focus}
                                />
                            )}
                            <View style={style.hiddenAction}>
                                <EmojiQuickAction
                                    testID={`${testID}.emoji_action`}
                                    value={value}
                                    updateValue={updateValue}
                                    cursorPosition={cursorPosition}
                                    updateCursorPosition={updateCursorPosition}
                                    focus={focus}
                                />
                            </View>
                            <FileQuickAction
                                testID={`${testID}.file_action`}
                                disabled={!canUploadFiles}
                                fileCount={files.length}
                                maxFileCount={10}
                                maxFilesReached={files.length >= 10}
                                onUploadFiles={addFiles}
                            />
                            <ImageQuickAction
                                testID={`${testID}.image_action`}
                                disabled={!canUploadFiles}
                                fileCount={files.length}
                                maxFileCount={10}
                                maxFilesReached={files.length >= 10}
                                onUploadFiles={addFiles}
                            />
                            <View style={style.hiddenAction}>
                                <CameraQuickAction
                                    testID={`${testID}.camera_action`}
                                    disabled={!canUploadFiles}
                                    fileCount={files.length}
                                    maxFileCount={10}
                                    maxFilesReached={files.length >= 10}
                                    onUploadFiles={addFiles}
                                />
                            </View>
                            {canShowPostPriority && (
                                <PostPriorityAction
                                    testID={`${testID}.post_priority_action`}
                                    postPriority={postPriority}
                                    updatePostPriority={updatePostPriority}
                                />
                            )}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

export default DraftInput;
