// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import {useManagedConfig} from '@mattermost/react-native-emm';
import PasteableTextInput, {type PastedFile, type PasteInputRef} from '@mattermost/react-native-paste-input';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessage, type IntlShape, useIntl} from 'react-intl';
import {
    Alert, AppState, type AppStateStatus, DeviceEventEmitter, type EmitterSubscription, Keyboard,
    type NativeSyntheticEvent, Platform, type TextInputSelectionChangeEventData,
} from 'react-native';
import {runOnUI} from 'react-native-reanimated';

import {updateDraftMessage} from '@actions/local/draft';
import {userTyping} from '@actions/websocket/users';
import {Events, Screens} from '@constants';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useInputPropagation} from '@hooks/input';
import NavigationStore from '@store/navigation_store';
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

    const {
        setShowInputAccessoryView,
        showInputAccessoryView,
        isInputAccessoryViewMode,
        inputAccessoryViewAnimatedHeight,
        height,
        isTransitioningFromCustomView,
    } = useKeyboardAnimationContext();

    const [propagateValue, shouldProcessEvent] = useInputPropagation();

    const lastTypingEventSent = useRef(0);

    const lastNativeValue = useRef('');
    const previousAppState = useRef(AppState.currentState);
    const [isManuallyFocusingAfterEmojiDismiss, setIsManuallyFocusingAfterEmojiDismiss] = useState(false);
    const isDismissingEmojiPicker = useRef(false);
    const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [longMessageAlertShown, setLongMessageAlertShown] = useState(false);

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

    // Handle press event (fires BEFORE onFocus) - dismiss emoji picker before keyboard opens
    const handlePress = useCallback(() => {
        if (Platform.OS === 'android' && showInputAccessoryView) {
            isDismissingEmojiPicker.current = true;
            setIsManuallyFocusingAfterEmojiDismiss(true);

            runOnUI(() => {
                'worklet';
                inputAccessoryViewAnimatedHeight.value = 0;
                height.value = 0;
                isInputAccessoryViewMode.value = false;
                isTransitioningFromCustomView.value = true;
            })();

            setShowInputAccessoryView(false);
        }
    }, [showInputAccessoryView, inputAccessoryViewAnimatedHeight, setShowInputAccessoryView, isInputAccessoryViewMode, height, isTransitioningFromCustomView]);

    // Handle focus after emoji picker is dismissed
    useEffect(() => {
        if (Platform.OS === 'android' && isManuallyFocusingAfterEmojiDismiss && !showInputAccessoryView) {
            isDismissingEmojiPicker.current = false;

            if (focusTimeoutRef.current) {
                clearTimeout(focusTimeoutRef.current);
            }

            inputRef.current?.blur();

            const handleDelayedFocus = () => {
                inputRef.current?.focus();
                setIsManuallyFocusingAfterEmojiDismiss(false);
                focusTimeoutRef.current = null;
            };

            focusTimeoutRef.current = setTimeout(handleDelayedFocus, 200);

            return () => {
                if (focusTimeoutRef.current) {
                    clearTimeout(focusTimeoutRef.current);
                    focusTimeoutRef.current = null;
                }
            };
        }

        return undefined;
    }, [isManuallyFocusingAfterEmojiDismiss, showInputAccessoryView, inputRef]);

    const onFocus = useCallback(() => {
        // Ignore focus events during emoji picker dismissal - handled manually
        if (Platform.OS === 'android' && (isDismissingEmojiPicker.current || focusTimeoutRef.current || isManuallyFocusingAfterEmojiDismiss)) {
            return;
        }

        setIsFocused(true);
        setShowInputAccessoryView(false);

        if (Platform.OS === 'android') {
            if (!focusTimeoutRef.current) {
                setIsManuallyFocusingAfterEmojiDismiss(false);
            }
            height.value = inputAccessoryViewAnimatedHeight.value;
            inputAccessoryViewAnimatedHeight.value = 0;
            isInputAccessoryViewMode.value = false;
            return;
        }

        // Transition from emoji picker to keyboard
        if (showInputAccessoryView) {
            // Save current emoji picker height to maintain input position
            const emojiPickerHeight = inputAccessoryViewAnimatedHeight.value;

            // Collapse emoji picker instantly
            inputAccessoryViewAnimatedHeight.value = 0;

            // Set input container height to emoji picker height to keep it at same position
            height.value = emojiPickerHeight;

            // Disable custom view mode to allow keyboard handlers to work
            isInputAccessoryViewMode.value = false;

            // Set transition flag to prevent keyboard handlers from interfering during transition
            isTransitioningFromCustomView.value = true;

            // Hide emoji picker component
            setShowInputAccessoryView(false);

            // Safety net: In rare cases (app backgrounding, system interruptions, rapid toggling),
            // the keyboard onEnd event might not fire, leaving us stuck in transition state.
            // This timeout ensures we recover after 1 second if that happens.
            setTimeout(() => {
                if (isTransitioningFromCustomView.value) {
                    isTransitioningFromCustomView.value = false;
                }
            }, 1000);
        }
    }, [setIsFocused, showInputAccessoryView, inputAccessoryViewAnimatedHeight, setShowInputAccessoryView, isInputAccessoryViewMode, height, isTransitioningFromCustomView, isManuallyFocusingAfterEmojiDismiss]);

    const handleAndroidKeyboardHide = useCallback(() => {
        onBlur();
    }, [onBlur]);

    const handleAndroidKeyboardShow = useCallback(() => {
        onFocus();
    }, [onFocus]);

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
        const cp = fromHandleTextChange ? cursorPosition : event!.nativeEvent.selection.end;

        updateCursorPosition(cp);
    }, [updateCursorPosition, cursorPosition]);

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
        let keyboardHideListener: EmitterSubscription | undefined;
        let keyboardShowListener: EmitterSubscription | undefined;
        if (Platform.OS === 'android') {
            keyboardHideListener = Keyboard.addListener('keyboardDidHide', handleAndroidKeyboardHide);
            keyboardShowListener = Keyboard.addListener('keyboardDidShow', handleAndroidKeyboardShow);
        }

        return (() => {
            keyboardShowListener?.remove();
            keyboardHideListener?.remove();
        });
    }, [handleAndroidKeyboardHide, handleAndroidKeyboardShow]);

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
            showSoftInputOnFocus={Platform.OS === 'android' ? (!showInputAccessoryView || isManuallyFocusingAfterEmojiDismiss) : true}
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
