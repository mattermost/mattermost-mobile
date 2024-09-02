// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import GraphemeSplitter from 'grapheme-splitter';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {type LayoutChangeEvent, Platform, ScrollView, View, Keyboard} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {EmojiIndicesByAlias, Emojis} from '@app/utils/emoji';
import {General} from '@constants';
import {MENTIONS_REGEX} from '@constants/autocomplete';
import {PostPriorityType} from '@constants/post';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {persistentNotificationsConfirmation} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CustomEmojiPicker from '../custom_emoji_picker';
import PostInput from '../post_input';
import QuickActions from '../quick_actions';
import SendAction from '../send_action';
import Typing from '../typing';
import Uploads from '../uploads';

import Header from './header';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';
import type {KeyboardTrackingViewRef} from 'libraries/@mattermost/keyboard-tracker/src';

type Props = {
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
    updateCursorPosition: React.Dispatch<React.SetStateAction<number>>;
    cursorPosition: number;

    // Send Handler
    sendMessage: () => void;
    canSend: boolean;
    maxMessageLength: number;

    // Draft Handler
    files: FileInfo[];
    value: string;
    uploadFileError: React.ReactNode;
    updateValue: React.Dispatch<React.SetStateAction<string>>;
    addFiles: (files: FileInfo[]) => void;
    updatePostInputTop: (top: number) => void;
    setIsFocused: (isFocused: boolean) => void;
    keyboardTracker: React.RefObject<KeyboardTrackingViewRef>;
    scrollViewNativeID: string | undefined;
}

const SAFE_AREA_VIEW_EDGES: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        actionsContainer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: Platform.select({
                ios: 1,
                android: 2,
            }),
        },
        inputContainer: {
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
            flexDirection: 'column',
            paddingBottom: 2,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.20),
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
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

export default function DraftInput({
    testID,
    channelId,
    channelType,
    channelName,
    currentUserId,
    canShowPostPriority,
    files,
    maxMessageLength,
    rootId = '',
    value,
    uploadFileError,
    sendMessage,
    canSend,
    updateValue,
    addFiles,
    updateCursorPosition,
    cursorPosition,
    updatePostInputTop,
    postPriority,
    updatePostPriority,
    persistentNotificationInterval,
    persistentNotificationMaxRecipients,
    setIsFocused,
    keyboardTracker,
    scrollViewNativeID,
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isEmojiPickerFocused, setIsEmojiPickerFocused] = useState(false);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        updatePostInputTop(e.nativeEvent.layout.height);
    }, []);

    // To keep track of cursor position and to retrieve the latest value of cursor position
    const cursorPositionRef = useRef(cursorPosition);
    useEffect(() => {
        cursorPositionRef.current = cursorPosition;
    }, [cursorPosition]);

    const handleEmojiPress = (emojiName: string) => {
        updateValue((v) => {
            const name = emojiName.trim();
            const currentCursorPosition = cursorPositionRef.current;
            let unicode;
            const imageUrl = '';
            if (EmojiIndicesByAlias.get(name)) {
                const emoji = Emojis[EmojiIndicesByAlias.get(name)!];
                if (emoji.category === 'custom') {
                    return `${v.slice(0, currentCursorPosition)} :${emojiName}: ${v.slice(currentCursorPosition)}`;
                }
                unicode = emoji.image;
                if (unicode && !imageUrl) {
                    const codeArray = unicode.split('-');
                    // eslint-disable-next-line max-nested-callbacks
                    const code = codeArray.reduce((acc: string, c: string) => {
                        return acc + String.fromCodePoint(parseInt(c, 16));
                    }, '');
                    return v.slice(0, currentCursorPosition) + code + v.slice(currentCursorPosition);
                }
            }
            return `${v.slice(0, currentCursorPosition)} :${emojiName}: ${v.slice(currentCursorPosition)}`;
        });
    };

    const inputRef = useRef<PasteInputRef>();

    const focus = useCallback(() => {
        inputRef.current?.setNativeProps({
            showSoftInputOnFocus: true,
        });
        inputRef.current?.focus();
    }, []);

    const handleToggleEmojiPicker = () => {
        if (!isEmojiPickerOpen) {
            setIsEmojiPickerOpen(true);
            setIsEmojiPickerFocused(true);
            inputRef.current?.setNativeProps({
                showSoftInputOnFocus: false,
            });
            Keyboard.dismiss();
            keyboardTracker.current?.pauseTracking(scrollViewNativeID || channelId);
            return;
        }
        if (Platform.OS === 'android' && isEmojiPickerFocused) {
            setIsEmojiPickerFocused(false);
            setIsEmojiPickerOpen(false);
            focus();
            return;
        }
        if (Platform.OS === 'ios' && Keyboard.isVisible()) {
            inputRef.current?.setNativeProps({
                showSoftInputOnFocus: false,
            });
            Keyboard.dismiss();
            setIsEmojiPickerFocused(true);
        } else {
            setIsEmojiPickerFocused(false);
            focus();
        }
    };

    const deleteCharFromCurrentCursorPosition = () => {
        const currentCursorPosition = cursorPositionRef.current;
        if (currentCursorPosition === 0) {
            return;
        }
        const splitter = new GraphemeSplitter();
        const valueBeforeCursor = value.slice(0, currentCursorPosition);
        const clusters = splitter.splitGraphemes(valueBeforeCursor);
        clusters.pop();
        const updatedValue = clusters.join('') + value.slice(currentCursorPosition);
        updateValue(updatedValue);
        updateCursorPosition(clusters.join('').length);
    };

    // Render
    const postInputTestID = `${testID}.post.input`;
    const quickActionsTestID = `${testID}.quick_actions`;
    const sendActionTestID = `${testID}.send_action`;
    const style = getStyleSheet(theme);

    const persistentNotificationsEnabled = postPriority.persistent_notifications && postPriority.priority === PostPriorityType.URGENT;
    const {noMentionsError, mentionsList} = useMemo(() => {
        let error = false;
        let mentions: string[] = [];
        if (
            channelType !== General.DM_CHANNEL &&
            persistentNotificationsEnabled
        ) {
            mentions = (value.match(MENTIONS_REGEX) || []);
            error = mentions.length === 0;
        }

        return {noMentionsError: error, mentionsList: mentions};
    }, [channelType, persistentNotificationsEnabled, value]);

    const handleSendMessage = useCallback(async () => {
        if (persistentNotificationsEnabled) {
            persistentNotificationsConfirmation(serverUrl, value, mentionsList, intl, sendMessage, persistentNotificationMaxRecipients, persistentNotificationInterval, currentUserId, channelName, channelType);
        } else {
            sendMessage();
        }
    }, [serverUrl, mentionsList, persistentNotificationsEnabled, persistentNotificationMaxRecipients, sendMessage, value, channelType]);

    const sendActionDisabled = !canSend || noMentionsError;

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
                    <PostInput
                        testID={postInputTestID}
                        channelId={channelId}
                        maxMessageLength={maxMessageLength}
                        rootId={rootId}
                        cursorPosition={cursorPosition}
                        updateCursorPosition={updateCursorPosition}
                        updateValue={updateValue}
                        value={value}
                        addFiles={addFiles}
                        sendMessage={handleSendMessage}
                        inputRef={inputRef}
                        setIsFocused={setIsFocused}
                        setIsEmojiPickerOpen={setIsEmojiPickerOpen}
                    />
                    <Uploads
                        currentUserId={currentUserId}
                        files={files}
                        uploadFileError={uploadFileError}
                        channelId={channelId}
                        rootId={rootId}
                    />
                    <View style={style.actionsContainer}>
                        <QuickActions
                            testID={quickActionsTestID}
                            fileCount={files.length}
                            addFiles={addFiles}
                            updateValue={updateValue}
                            value={value}
                            postPriority={postPriority}
                            updatePostPriority={updatePostPriority}
                            canShowPostPriority={canShowPostPriority}
                            focus={focus}
                            handleToggleEmojiPicker={handleToggleEmojiPicker}
                            isEmojiPickerFocused={isEmojiPickerFocused}
                        />
                        <SendAction
                            testID={sendActionTestID}
                            disabled={sendActionDisabled}
                            sendMessage={handleSendMessage}
                        />
                    </View>
                </ScrollView>
                {isEmojiPickerOpen &&
                    <CustomEmojiPicker
                        onEmojiPress={handleEmojiPress}
                        focus={focus}
                        deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
                        setIsEmojiPickerOpen={setIsEmojiPickerOpen}
                        setIsEmojiPickerFocused={setIsEmojiPickerFocused}
                    />
                }
            </SafeAreaView>
        </>
    );
}
