// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-nested-callbacks */

import GraphemeSplitter from 'grapheme-splitter';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {type LayoutChangeEvent, Platform, ScrollView, View, DeviceEventEmitter, BackHandler, type NativeEventSubscription} from 'react-native';
import Animated, {Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {popTopScreen} from '@app/screens/navigation';
import {EmojiIndicesByAlias, Emojis} from '@app/utils/emoji';
import {Events, General, Screens} from '@constants';
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
}

const SAFE_AREA_VIEW_EDGES: Edge[] = ['left', 'right'];
const EMOJI_PICKER_HEIGHT = 301;

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
        customEmojiPickerContainer: {
            marginTop: 9,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
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
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = React.useState(false);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        updatePostInputTop(e.nativeEvent.layout.height);
    }, [updatePostInputTop]);

    // Use useRef to track and always retrieve the latest cursor position without triggering re-renders.
    // This approach is used to improve performance, as the child component was re-rendering frequently
    // due to isEmojiPress being added to the callback's dependency array.
    // Further investigation may be needed to optimize this behavior.
    const cursorPositionRef = useRef(cursorPosition);
    useEffect(() => {
        cursorPositionRef.current = cursorPosition;
    }, [cursorPosition]);

    const handleEmojiPress = useCallback((emojiName: string) => {
        updateValue((v) => {
            const name = emojiName.trim();
            const currentCursorPosition = cursorPositionRef.current;

            // Cursor position is not updated by default on Android, so we need to update it manually
            if (Platform.OS === 'android') {
                // Updating curso position by 2 to account for the added emoji as emoji takes 2 characters
                updateCursorPosition((prev) => prev + 2);
            }
            let unicode;
            if (EmojiIndicesByAlias.get(name)) {
                const emoji = Emojis[EmojiIndicesByAlias.get(name)!];
                if (emoji.category === 'custom') {
                    return `${v.slice(0, currentCursorPosition)} :${emojiName}: ${v.slice(currentCursorPosition)}`;
                }
                unicode = emoji.image;
                if (unicode) {
                    const codeArray = unicode.split('-');
                    const code = codeArray.reduce((acc: string, c: string) => {
                        return acc + String.fromCodePoint(parseInt(c, 16));
                    }, '');
                    return v.slice(0, currentCursorPosition) + code + v.slice(currentCursorPosition);
                }
            }
            return `${v.slice(0, currentCursorPosition)} :${emojiName}: ${v.slice(currentCursorPosition)}`;
        });
    }, [updateValue, cursorPositionRef.current]);

    const inputRef = useRef<PasteInputRef>();

    const focus = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const height = useSharedValue(EMOJI_PICKER_HEIGHT);

    const handleToggleEmojiPicker = useCallback(() => {
        if (!isEmojiPickerOpen) {
            height.value = withTiming(EMOJI_PICKER_HEIGHT, {
                duration: 0,
                easing: Easing.out(Easing.cubic),
            }, (finised) => {
                if (finised) {
                    runOnJS(setIsEmojiPickerOpen)(true);
                }
            });
            inputRef.current?.blur();
            return;
        }
        if (Platform.OS === 'android' && isEmojiPickerOpen) {
            setIsEmojiPickerOpen(false);
            setIsEmojiSearchFocused(false);
            inputRef.current?.blur();
            focus();
            return;
        }
        height.value = withTiming(0, {
            duration: 80,
            easing: Easing.in(Easing.cubic),
        });
        setTimeout(() => {
            setIsEmojiPickerOpen(false);
            setIsEmojiSearchFocused(false);
        }, 0);
        focus();
    }, [focus, height, isEmojiPickerOpen]);

    useEffect(() => {
        const closeEmojiPickerEvent = DeviceEventEmitter.addListener(Events.CLOSE_EMOJI_PICKER, () => {
            if (isEmojiPickerOpen || isEmojiSearchFocused) {
                height.value = withTiming(0, {
                    duration: 80,
                    easing: Easing.in(Easing.cubic),
                });
                setIsEmojiPickerOpen(false);
                setIsEmojiSearchFocused(false);
                inputRef.current?.setNativeProps({
                    showSoftInputOnFocus: true,
                });
            }
        });

        return () => {
            closeEmojiPickerEvent.remove();
        };
    }, [isEmojiPickerOpen, isEmojiSearchFocused, height]);

    useEffect(() => {
        let backHandler: NativeEventSubscription | undefined;

        if (Platform.OS === 'android') {
            const backAction = () => {
                if (isEmojiPickerOpen || isEmojiSearchFocused) {
                    setIsEmojiPickerOpen(false);
                    setIsEmojiSearchFocused(false);
                    return true;
                }
                popTopScreen(Screens.CHANNEL);
                return false;
            };

            backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        }
        return () => {
            backHandler?.remove();
        };
    }, [isEmojiPickerOpen, isEmojiSearchFocused]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: height.value,
        };
    });

    const deleteCharFromCurrentCursorPosition = useCallback(() => {
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
    }, [
        updateCursorPosition,
        value,
        updateValue,
    ]);

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
    }, [persistentNotificationsEnabled, serverUrl, value, mentionsList, intl, sendMessage, persistentNotificationMaxRecipients, persistentNotificationInterval, currentUserId, channelName, channelType]);

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
                        isEmojiPickerOpen={isEmojiPickerOpen}
                        handleToggleEmojiPicker={handleToggleEmojiPicker}
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
                            isEmojiPickerOpen={isEmojiPickerOpen}
                        />
                        <SendAction
                            testID={sendActionTestID}
                            disabled={sendActionDisabled}
                            sendMessage={handleSendMessage}
                        />
                    </View>
                </ScrollView>
                {isEmojiPickerOpen &&
                    <Animated.View style={[style.customEmojiPickerContainer, animatedStyle]}>
                        <CustomEmojiPicker
                            height={height}
                            isEmojiSearchFocused={isEmojiSearchFocused}
                            setIsEmojiSearchFocused={setIsEmojiSearchFocused}
                            onEmojiPress={handleEmojiPress}
                            handleToggleEmojiPicker={handleToggleEmojiPicker}
                            deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
                        />
                    </Animated.View>
                }
            </SafeAreaView>
        </>
    );
}
