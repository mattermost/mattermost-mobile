// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import {useManagedConfig} from '@mattermost/react-native-emm';
import PasteableTextInput, {type PastedFile, type PasteInputRef} from '@mattermost/react-native-paste-input';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessage, type IntlShape, useIntl} from 'react-intl';
import {
    Alert, AppState, type AppStateStatus, DeviceEventEmitter,
    type NativeSyntheticEvent, Platform, type TextInputSelectionChangeEventData,
} from 'react-native';
import {runOnUI} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {updateDraftMessage} from '@actions/local/draft';
import {userTyping} from '@actions/websocket/users';
import {Events, Screens} from '@constants';
import {isAndroidEdgeToEdge} from '@constants/device';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useInputPropagation} from '@hooks/input';
import {useFocusAfterEmojiDismiss} from '@hooks/useFocusAfterEmojiDismiss';
import {DEFAULT_INPUT_ACCESSORY_HEIGHT} from '@hooks/useInputAccessoryView';
import {NavigationStore} from '@store/navigation_store';
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
    inputRef: React.MutableRefObject<PasteInputRef | undefined>;
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
    inputRef,
    setIsFocused,
}: Props) {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const insets = useSafeAreaInsets();

    const {
        setShowInputAccessoryView,
        showInputAccessoryView,
        isInputAccessoryViewMode,
        inputAccessoryViewAnimatedHeight,
        keyboardTranslateY,
        isTransitioningFromCustomView,
        setIsEmojiSearchFocused,
        isEmojiSearchFocused,
        keyboardHeight,
        lastKeyboardHeight,
        bottomInset,
        scrollOffset,
        registerCursorPosition,
        registerPostInputCallbacks,
    } = useKeyboardAnimationContext();

    // Register cursor position updates with context
    useEffect(() => {
        if (showInputAccessoryView) {
            return;
        }
        if (registerCursorPosition) {
            registerCursorPosition(cursorPosition);
        }
    }, [registerCursorPosition, cursorPosition, showInputAccessoryView]);

    // Register updateValue and updateCursorPosition with context
    useEffect(() => {
        if (registerPostInputCallbacks) {
            registerPostInputCallbacks(updateValue, updateCursorPosition);
        }
    }, [registerPostInputCallbacks, updateValue, updateCursorPosition]);

    const [propagateValue, shouldProcessEvent] = useInputPropagation();

    const lastTypingEventSent = useRef(0);

    const lastNativeValue = useRef('');
    const previousAppState = useRef(AppState.currentState);

    const [longMessageAlertShown, setLongMessageAlertShown] = useState(false);

    // Handle focus after emoji picker dismissal
    const focusInput = useCallback(() => {
        inputRef.current?.focus();
    }, [inputRef]);

    const {
        focus: focusWithEmojiDismiss,
        isDismissingEmojiPicker,
        focusTimeoutRef,
        isManuallyFocusingAfterEmojiDismiss,
    } = useFocusAfterEmojiDismiss(inputRef, focusInput);

    const disableCopyAndPaste = managedConfig.copyAndPasteProtection === 'true';
    const maxHeight = isTablet ? 150 : 88;
    const pasteInputStyle = useMemo(() => {
        return {...style.input, maxHeight};
    }, [maxHeight, style.input]);

    const onBlur = useCallback(() => {
        handleDraftUpdate({
            serverUrl,
            channelId,
            rootId,
            value,
        });
        setIsFocused(false);
    }, [serverUrl, channelId, rootId, value, setIsFocused]);

    // Refs to capture emoji picker state before it's dismissed by handlePress
    // This is necessary because on Android, handlePress dismisses the emoji picker
    // before onFocus is called, so we need to capture the state early
    const wasShowingEmojiPickerRef = useRef(false);
    const emojiPickerHeightRef = useRef(0);

    // Handle press event (fires BEFORE onFocus) - dismiss emoji picker before keyboard opens
    const handlePress = useCallback(() => {
        // Capture emoji picker state BEFORE dismissing it
        // This happens before focusWithEmojiDismiss() which clears these values
        wasShowingEmojiPickerRef.current = isInputAccessoryViewMode.value;
        emojiPickerHeightRef.current = inputAccessoryViewAnimatedHeight.value;
        focusWithEmojiDismiss();
    }, [focusWithEmojiDismiss, isInputAccessoryViewMode, inputAccessoryViewAnimatedHeight]);

    const onFocus = useCallback(() => {
        // On Android EdgeToEdge, ignore subsequent focus events during transition from emoji picker to keyboard
        // The first onFocus handles the transition, subsequent calls would interfere
        if (isAndroidEdgeToEdge && isTransitioningFromCustomView.value) {
            return;
        }

        // Ignore focus events during emoji picker dismissal - handled manually
        if (!isAndroidEdgeToEdge && (isDismissingEmojiPicker.current || focusTimeoutRef.current || isManuallyFocusingAfterEmojiDismiss)) {
            return;
        }

        // On Android, ignore focus events when emoji search is focused
        // This prevents the emoji picker from closing when the search bar gets focus
        if (Platform.OS === 'android' && isEmojiSearchFocused) {
            return;
        }

        setIsFocused(true);

        // Reset emoji search focus immediately to prevent jumping
        // This must happen before closing the emoji picker
        setIsEmojiSearchFocused(false);

        // Detect if emoji picker is showing:
        // 1. wasShowingEmojiPickerRef: Captured from handlePress when user taps to close emoji picker
        // 2. isInputAccessoryViewMode.value: SharedValue that's true when emoji picker is currently open
        // We need both checks because when switching from emoji search to post input,
        // handlePress doesn't fire, so we need to check the current SharedValue state
        // IMPORTANT: Use SharedValue (synchronous) not React state (asynchronous)
        const wasShowingEmojiPicker = wasShowingEmojiPickerRef.current || isInputAccessoryViewMode.value;

        // Close emoji picker immediately
        setShowInputAccessoryView(false);

        // Reset ref after processing (for next time)
        if (Platform.OS === 'android') {
            if (isAndroidEdgeToEdge && wasShowingEmojiPicker) {
                // Android 35+ with edge-to-edge: Smooth transition from emoji picker to keyboard
                // Use the captured height from refs if available, otherwise use current animated height
                const currentEmojiPickerHeight = emojiPickerHeightRef.current || inputAccessoryViewAnimatedHeight.value;
                const targetKeyboardHeight = keyboardHeight.value || lastKeyboardHeight || (DEFAULT_INPUT_ACCESSORY_HEIGHT - insets.bottom);

                // When emoji picker search is focused, the emoji picker height includes search bar + extra padding
                // We should use the keyboard height instead to avoid a gap
                // If currentEmojiPickerHeight > targetKeyboardHeight, we're coming from emoji search
                const transitionHeight = (currentEmojiPickerHeight > targetKeyboardHeight) ? targetKeyboardHeight : currentEmojiPickerHeight;

                // Set transition flag FIRST to prevent keyboard handlers from interfering
                isTransitioningFromCustomView.value = true;

                // Collapse emoji picker instantly
                inputAccessoryViewAnimatedHeight.value = 0;

                // Set input container position to prevent jump during transition
                keyboardTranslateY.value = transitionHeight > 0 ? transitionHeight : targetKeyboardHeight;

                // Use runOnUI to disable input accessory view mode atomically
                runOnUI(() => {
                    'worklet';

                    // Disable custom view mode to allow keyboard handlers to work
                    isInputAccessoryViewMode.value = false;
                })();

                // Clear transition flag synchronously AFTER setting position
                // This ensures subsequent onFocus calls (including from the same button press) can proceed
                isTransitioningFromCustomView.value = false;

                // Reset refs immediately after using them
                // Subsequent onFocus calls will see false and process normally (opening keyboard without transition)
                wasShowingEmojiPickerRef.current = false;
                emojiPickerHeightRef.current = 0;

                return;
            }

            // Android < 35: Original behavior
            keyboardTranslateY.value = inputAccessoryViewAnimatedHeight.value;
            inputAccessoryViewAnimatedHeight.value = 0;
            isInputAccessoryViewMode.value = false;

            // IMPORTANT: Reset isTransitioningFromCustomView when keyboard opens
            // This ensures emoji picker can be opened again after keyboard appears
            isTransitioningFromCustomView.value = false;

            // Reset bottomInset and scrollOffset so the scroll restoration can trigger when emoji picker closes
            bottomInset.value = 0;
            scrollOffset.value = 0;

            return;
        }

        // Transition from emoji picker to keyboard
        if (showInputAccessoryView) {
            // Use actual keyboard height instead of emoji picker height to ensure consistency
            // This prevents height accumulation when transitioning multiple times
            // Use default keyboard height if no keyboard height has been recorded yet
            // This prevents input container from going to bottom when keyboard hasn't been opened
            const targetKeyboardHeight = keyboardHeight.value || lastKeyboardHeight || DEFAULT_INPUT_ACCESSORY_HEIGHT;

            // Set transition flag FIRST synchronously to prevent keyboard handlers from interfering
            // This must be set before disabling input accessory view mode to avoid race conditions
            isTransitioningFromCustomView.value = true;

            // Collapse emoji picker instantly
            inputAccessoryViewAnimatedHeight.value = 0;

            // Set input container height to keyboard height to ensure correct final position
            // This ensures the height always matches the keyboard, preventing accumulation
            keyboardTranslateY.value = targetKeyboardHeight;

            // Use runOnUI to disable input accessory view mode atomically
            // This ensures the transition flag is visible when keyboard handlers start processing
            runOnUI(() => {
                'worklet';

                // Disable custom view mode to allow keyboard handlers to work
                // This is done AFTER setting transition flag to prevent race conditions
                isInputAccessoryViewMode.value = false;
            })();

            // Safety net: In rare cases (app backgrounding, system interruptions, rapid toggling),
            // the keyboard onEnd event might not fire, leaving us stuck in transition state.
            // This timeout ensures we recover after 1 second if that happens.
            setTimeout(() => {
                if (isTransitioningFromCustomView.value) {
                    isTransitioningFromCustomView.value = false;
                }
            }, 1000);
        }

        // Shared values don't need to be in dependencies - they're stable references
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isDismissingEmojiPicker,
        focusTimeoutRef,
        isManuallyFocusingAfterEmojiDismiss,
        isEmojiSearchFocused,
        setIsFocused,
        setIsEmojiSearchFocused,
        setShowInputAccessoryView,
        showInputAccessoryView,
        lastKeyboardHeight,
    ]);

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

    const handlePostDraftSelectionChanged = useCallback((event: NativeSyntheticEvent<TextInputSelectionChangeEventData> | null, fromHandleTextChange = false) => {
        if (showInputAccessoryView && !fromHandleTextChange) {
            return;
        }
        const cp = fromHandleTextChange ? cursorPosition : event!.nativeEvent.selection.end;

        updateCursorPosition(cp);
    }, [showInputAccessoryView, cursorPosition, updateCursorPosition]);

    const handleTextChange = useCallback((newValue: string) => {
        if (!shouldProcessEvent(newValue)) {
            return;
        }
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
        shouldProcessEvent,
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
        const topScreen = NavigationStore.getVisibleScreen();
        let sourceScreen: AvailableScreens = Screens.CHANNEL;
        if (rootId) {
            sourceScreen = Screens.THREAD;
        } else if (isTablet) {
            sourceScreen = Screens.HOME;
        }
        if (topScreen === sourceScreen) {
            sendMessage();
        }
    }, [sendMessage, rootId, isTablet]);

    const handleHardwareShiftEnter = useCallback(() => {
        const topScreen = NavigationStore.getVisibleScreen();
        let sourceScreen: AvailableScreens = Screens.CHANNEL;
        if (rootId) {
            sourceScreen = Screens.THREAD;
        } else if (isTablet) {
            sourceScreen = Screens.HOME;
        }

        if (topScreen === sourceScreen) {
            let newValue: string;
            updateValue((v) => {
                newValue = v.substring(0, cursorPosition) + '\n' + v.substring(cursorPosition);
                return newValue;
            });
            updateCursorPosition((pos) => pos + 1);
            propagateValue(newValue!);
        }
    }, [rootId, isTablet, updateValue, updateCursorPosition, cursorPosition, propagateValue]);

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
                propagateValue(draft);
                inputRef.current?.focus();
            }
        });
        return () => {
            listener.remove();
            updateDraftMessage(serverUrl, channelId, rootId, lastNativeValue.current); // safe draft on unmount
        };

    // - updateValue, updateCursorPosition, propagateValue are stable setState/hook functions
    // - inputRef is a ref (stable reference, doesn't need to be in deps)
    // - serverUrl, value, lastNativeValue are either stable or we want their latest values when event fires
    // - We need to recreate the listener when channelId/rootId changes to check the correct source screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateValue, channelId, rootId]);

    useEffect(() => {
        if (value !== lastNativeValue.current) {
            propagateValue(value);
            lastNativeValue.current = value;
        }

    // - propagateValue is from useInputPropagation hook (stable reference, doesn't need to be in deps)
    // - lastNativeValue is a ref (stable reference, doesn't need to be in deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const events = useMemo(() => ({
        onEnterPressed: handleHardwareEnterPress,
        onShiftEnterPressed: handleHardwareShiftEnter,
    }), [handleHardwareEnterPress, handleHardwareShiftEnter]);
    useHardwareKeyboardEvents(events);

    return (
        <PasteableTextInput
            allowFontScaling={true}
            disableCopyPaste={disableCopyAndPaste}
            disableFullscreenUI={true}
            keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
            multiline={true}
            onBlur={onBlur}
            onChangeText={handleTextChange}
            onFocus={onFocus}
            onPress={Platform.OS === 'android' ? handlePress : undefined}
            onPaste={onPaste}
            onSelectionChange={handlePostDraftSelectionChanged}
            placeholder={intl.formatMessage(getPlaceHolder(rootId), {channelDisplayName})}
            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
            ref={inputRef}
            showSoftInputOnFocus={true}
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
    );
}
