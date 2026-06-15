// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import {useManagedConfig} from '@mattermost/react-native-emm';
import PasteableTextInput, {type PastedFile} from '@mattermost/react-native-paste-input';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessage, type IntlShape, useIntl} from 'react-intl';
import {
    Alert, AppState, type AppStateStatus, DeviceEventEmitter,
    Platform, type TextInputSelectionChangeEvent,
} from 'react-native';
import {useAnimatedKeyboard} from 'react-native-keyboard-controller';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import {updateDraftMessage} from '@actions/local/draft';
import {userTyping} from '@actions/websocket/users';
import {useRewrite} from '@agents/hooks';
import {Events, Screens} from '@constants';
import {isAndroidEdgeToEdge} from '@constants/device';
import {useKeyboardState} from '@context/keyboard_state';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useCurrentScreen} from '@store/navigation_store';
import {handleDraftUpdate} from '@utils/draft';
import {extractFileInfo} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    testID?: string;
    channelDisplayName?: string;
    channelId: string;
    maxMessageLength: number;
    rootId: string;
    timeBetweenUserTypingUpdatesMilliseconds: number;
    maxNotificationsPerChannel: number;
    enableUserTypingMessage: boolean;
    membersInChannel: number;
    value: string;
    updateValue: React.Dispatch<React.SetStateAction<string>>;
    addFiles: (files: ExtractedFileInfo[]) => void;
    cursorPosition: number;
    updateCursorPosition: React.Dispatch<React.SetStateAction<number>>;
    sendMessage: () => void;
    setIsFocused: (isFocused: boolean) => void;
}

const showPasteFilesErrorDialog = (intl: IntlShape) => {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.files_paste.error_title',
            defaultMessage: 'Paste failed',
        }),
        intl.formatMessage({
            id: 'mobile.files_paste.error_description',
            defaultMessage: 'An error occurred while pasting the file(s). Please try again.',
        }),
        [
            {
                text: intl.formatMessage({
                    id: 'mobile.files_paste.error_dismiss',
                    defaultMessage: 'Dismiss',
                }),
            },
        ],
    );
};

const getPlaceHolder = (rootId?: string) => {
    let placeholder;

    if (rootId) {
        placeholder = defineMessage({id: 'create_post.thread_reply', defaultMessage: 'Reply to this thread...'});
    } else {
        placeholder = defineMessage({id: 'create_post.write', defaultMessage: 'Write to {channelDisplayName}'});
    }

    return placeholder;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    input: {
        color: theme.centerChannelColor,
        fontSize: 15,
        lineHeight: 20,
        paddingHorizontal: 12,
        paddingTop: Platform.select({
            ios: 6,
            android: 8,
        }),
        paddingBottom: Platform.select({
            ios: 6,
            android: 2,
        }),
        minHeight: 30,
    },
}));

export default function PostInput({
    testID,
    channelDisplayName,
    channelId,
    maxMessageLength,
    rootId,
    timeBetweenUserTypingUpdatesMilliseconds,
    maxNotificationsPerChannel,
    enableUserTypingMessage,
    membersInChannel,
    value,
    updateValue,
    addFiles,
    cursorPosition,
    updateCursorPosition,
    sendMessage,
    setIsFocused,
}: Props) {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const currentScreen = useCurrentScreen();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const animatedKeyboard = useAnimatedKeyboard();

    const {
        showInputAccessoryView,
        isEmojiSearchFocused,
        setCursorPosition,
        registerPostInputCallbacks,
        inputRef,
        stateMachine,
        stateContext,
    } = useKeyboardState();

    // Register cursor position updates with context
    // Always update cursorPositionRef, even when input accessory view is shown,
    // so emoji insertion works correctly at cursor position
    useEffect(() => {
        if (showInputAccessoryView) {
            return;
        }
        if (setCursorPosition) {
            setCursorPosition(cursorPosition);
        }
    }, [setCursorPosition, cursorPosition, showInputAccessoryView]);

    // Register updateValue and updateCursorPosition with context
    useEffect(() => {
        if (registerPostInputCallbacks) {
            registerPostInputCallbacks(updateValue, updateCursorPosition, value);
        }

        // updateValue and updateCursorPosition are stable setState functions — no need in deps.
        // value is intentionally excluded: we only want to seed cursorPosition once at registration
        // time, not on every keystroke. Ongoing cursor tracking is handled by setCursorPosition.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerPostInputCallbacks]);

    const {isProcessing} = useRewrite();
    const lastTypingEventSent = useRef(0);

    const lastNativeValue = useRef('');
    const previousAppState = useRef(AppState.currentState);

    const [longMessageAlertShown, setLongMessageAlertShown] = useState(false);

    const disableCopyAndPaste = managedConfig.copyAndPasteProtection === 'true';
    const maxHeight = isTablet ? 150 : 88;
    const pasteInputStyle = useMemo(() => {
        return {...style.input, maxHeight};
    }, [maxHeight, style.input]);

    // Pulsing animation for when AI rewrite is processing
    const pulseOpacity = useSharedValue(1);
    const pulsingAnimatedStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    useEffect(() => {
        if (isProcessing) {
            pulseOpacity.value = withRepeat(
                withTiming(0.5, {duration: 400, easing: Easing.inOut(Easing.ease)}),
                -1,
                true,
            );
        } else {
            pulseOpacity.value = withTiming(1, {duration: 200});
        }

        return () => {
            cancelAnimation(pulseOpacity);
        };
    }, [isProcessing, pulseOpacity]);

    const onBlur = useCallback(() => {
        handleDraftUpdate({
            serverUrl,
            channelId,
            rootId,
            value,
        });
        setIsFocused(false);
    }, [serverUrl, channelId, rootId, value, setIsFocused]);

    const onFocus = useCallback(() => {
        // On edge-to-edge Android, ignore focus events when emoji search is focused.
        // This prevents the emoji picker from closing when the search bar gets focus.
        // On non-edge-to-edge, we cannot skip: no keyboard events fire, so this is the
        // only place USER_FOCUS_INPUT is dispatched when tapping post input from search state.
        if (isAndroidEdgeToEdge && isEmojiSearchFocused) {
            return;
        }

        setIsFocused(true);

        // With hardware keyboard, keyboard events never fire so USER_FOCUS_INPUT is never
        // dispatched via useKeyboardEvents. Dispatch it here to close the emoji picker.
        // With software keyboard, useKeyboardEvents.onStart dispatches it on the UI thread.
        const isKeyboardClosed = animatedKeyboard.height.value === 0 && animatedKeyboard.state.value === 0;
        const asHardwareKeyboard = Platform.OS === 'ios' && isTablet && isKeyboardClosed;

        // On non-edge-to-edge Android, hasZeroKeyboardHeight is never set (KeyboardProvider disabled),
        // so we dispatch USER_FOCUS_INPUT whenever the emoji picker is active.
        // On edge-to-edge, only dispatch when keyboard is not expected to appear (hasZeroKeyboardHeight).
        const isNonEdgeToEdgeAndroid = Platform.OS === 'android' && !isAndroidEdgeToEdge;
        const hasZeroKbHeight = stateContext.hasZeroKeyboardHeight.value;
        const isPickerActive = stateMachine.isEmojiPickerActive();
        const shouldDispatch = (hasZeroKbHeight || isNonEdgeToEdgeAndroid) && isPickerActive;
        if (shouldDispatch || asHardwareKeyboard) {
            stateMachine.onUserFocusInput(asHardwareKeyboard);
        }
    }, [isEmojiSearchFocused, setIsFocused, stateMachine, stateContext, isTablet, animatedKeyboard]);

    const checkMessageLength = useCallback((newValue: string) => {
        const valueLength = newValue.trim().length;

        if (valueLength > maxMessageLength) {
            // Check if component is already aware message is too long
            if (!longMessageAlertShown) {
                Alert.alert(
                    intl.formatMessage({
                        id: 'mobile.message_length.title',
                        defaultMessage: 'Message Length',
                    }),
                    intl.formatMessage({
                        id: 'mobile.message_length.message',
                        defaultMessage: 'Your current message is too long. Current character count: {count}/{max}',
                    }, {
                        max: maxMessageLength,
                        count: valueLength,
                    }),
                );
                setLongMessageAlertShown(true);
            }
        } else if (longMessageAlertShown) {
            setLongMessageAlertShown(false);
        }
    }, [intl, longMessageAlertShown, maxMessageLength]);

    const handlePostDraftSelectionChanged = useCallback((event: TextInputSelectionChangeEvent | null, fromHandleTextChange = false) => {
        if (showInputAccessoryView && !fromHandleTextChange) {
            return;
        }
        const cp = fromHandleTextChange ? cursorPosition : event!.nativeEvent.selection.end;

        updateCursorPosition(cp);
    }, [showInputAccessoryView, cursorPosition, updateCursorPosition]);

    const handleTextChange = useCallback((newValue: string) => {
        updateValue(newValue);
        lastNativeValue.current = newValue;

        checkMessageLength(newValue);

        if (
            newValue &&
            lastTypingEventSent.current + timeBetweenUserTypingUpdatesMilliseconds < Date.now() &&
            membersInChannel < maxNotificationsPerChannel &&
            enableUserTypingMessage
        ) {
            userTyping(serverUrl, channelId, rootId);
            lastTypingEventSent.current = Date.now();
        }
    }, [
        updateValue,
        checkMessageLength,
        timeBetweenUserTypingUpdatesMilliseconds,
        membersInChannel,
        maxNotificationsPerChannel,
        enableUserTypingMessage,
        serverUrl,
        channelId,
        rootId,
    ]);

    const onPaste = useCallback(async (error: string | null | undefined, files: PastedFile[]) => {
        if (error) {
            showPasteFilesErrorDialog(intl);
        }

        addFiles(await extractFileInfo(files));
    }, [addFiles, intl]);

    const handleHardwareEnterPress = useCallback(() => {
        let sourceScreen: AvailableScreens = Screens.CHANNEL;
        if (rootId) {
            sourceScreen = Screens.THREAD;
        } else if (isTablet) {
            sourceScreen = Screens.HOME;
        }
        if (currentScreen === sourceScreen) {
            sendMessage();
        }
    }, [rootId, isTablet, currentScreen, sendMessage]);

    const handleHardwareShiftEnter = useCallback(() => {
        let sourceScreen: AvailableScreens = Screens.CHANNEL;
        if (rootId) {
            sourceScreen = Screens.THREAD;
        } else if (isTablet) {
            sourceScreen = Screens.HOME;
        }

        if (currentScreen === sourceScreen) {
            let newValue: string;
            updateValue((v) => {
                newValue = v.substring(0, cursorPosition) + '\n' + v.substring(cursorPosition);
                return newValue;
            });

            updateCursorPosition((pos) => pos + 1);
        }
    }, [rootId, isTablet, currentScreen, updateValue, updateCursorPosition, cursorPosition]);

    const onAppStateChange = useCallback((appState: AppStateStatus) => {
        if (appState !== 'active' && previousAppState.current === 'active') {
            updateDraftMessage(serverUrl, channelId, rootId, value);
        }

        previousAppState.current = appState;
    }, [serverUrl, channelId, rootId, value]);

    useEffect(() => {
        const listener = AppState.addEventListener('change', onAppStateChange);

        return () => {
            listener.remove();
        };
    }, [onAppStateChange]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.SEND_TO_POST_DRAFT, ({text, location}: {text: string; location: string}) => {
            const sourceScreen = channelId && rootId ? Screens.THREAD : Screens.CHANNEL;
            if (location === sourceScreen) {
                const draft = value ? `${value} ${text} ` : `${text} `;
                updateValue(draft);
                updateCursorPosition(draft.length);
                inputRef.current?.focus();
            }
        });
        return () => {
            listener.remove();
            updateDraftMessage(serverUrl, channelId, rootId, lastNativeValue.current); // safe draft on unmount
        };

    // - updateValue and updateCursorPosition are stable setState/hook functions
    // - inputRef is a ref (stable reference, doesn't need to be in deps)
    // - serverUrl, value, lastNativeValue are either stable or we want their latest values when event fires
    // - We need to recreate the listener when channelId/rootId changes to check the correct source screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateValue, channelId, rootId, inputRef]);

    useEffect(() => {
        if (value !== lastNativeValue.current) {
            lastNativeValue.current = value;
        }
    }, [value]);

    const events = useMemo(() => ({
        onEnterPressed: handleHardwareEnterPress,
        onShiftEnterPressed: handleHardwareShiftEnter,
    }), [handleHardwareEnterPress, handleHardwareShiftEnter]);
    useHardwareKeyboardEvents(events);

    return (
        <Animated.View style={pulsingAnimatedStyle}>
            <PasteableTextInput
                allowFontScaling={true}
                disableCopyPaste={disableCopyAndPaste}
                disableFullscreenUI={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                multiline={true}
                onBlur={onBlur}
                onChangeText={handleTextChange}
                onFocus={onFocus}
                onPaste={onPaste}
                onSelectionChange={handlePostDraftSelectionChanged}
                placeholder={intl.formatMessage(getPlaceHolder(rootId), {channelDisplayName})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                ref={inputRef}
                smartPunctuation='disable'
                submitBehavior='newline'
                style={pasteInputStyle}
                testID={testID}
                underlineColorAndroid='transparent'
                textContentType='none'
                value={value}
                autoCapitalize='sentences'
                nativeID={testID}
            />
        </Animated.View>
    );
}
