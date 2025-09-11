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

import {updateDraftMessage} from '@actions/local/draft';
import {userTyping} from '@actions/websocket/users';
import {Events, Screens} from '@constants';
import {useExtraKeyboardContext} from '@context/extra_keyboard';
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
    const keyboardContext = useExtraKeyboardContext();
    const [propagateValue, shouldProcessEvent] = useInputPropagation();

    const lastTypingEventSent = useRef(0);

    const lastNativeValue = useRef('');
    const previousAppState = useRef(AppState.currentState);

    const [longMessageAlertShown, setLongMessageAlertShown] = useState(false);

    const disableCopyAndPaste = managedConfig.copyAndPasteProtection === 'true';
    const maxHeight = isTablet ? 150 : 88;
    const pasteInputStyle = useMemo(() => {
        return {...style.input, maxHeight};
    }, [maxHeight, style.input]);

    const handleAndroidKeyboardHide = () => {
        onBlur();
    };

    const handleAndroidKeyboardShow = () => {
        onFocus();
    };

    const onBlur = useCallback(() => {
        keyboardContext?.registerTextInputBlur();
        handleDraftUpdate({
            serverUrl,
            channelId,
            rootId,
            value,
        });
        setIsFocused(false);
    }, [keyboardContext, serverUrl, channelId, rootId, value, setIsFocused]);

    const onFocus = useCallback(() => {
        keyboardContext?.registerTextInputFocus();
        setIsFocused(true);
    }, [setIsFocused, keyboardContext]);

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
    }, []);

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
    }, [updateValue, channelId, rootId]);

    useEffect(() => {
        if (value !== lastNativeValue.current) {
            propagateValue(value);
            lastNativeValue.current = value;
        }
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
        />
    );
}
