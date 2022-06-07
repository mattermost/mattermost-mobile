// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import PasteableTextInput, {PastedFile, PasteInputRef} from '@mattermost/react-native-paste-input';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {
    Alert, AppState, AppStateStatus, DeviceEventEmitter, EmitterSubscription, Keyboard,
    KeyboardTypeOptions, NativeSyntheticEvent, Platform, TextInputSelectionChangeEventData,
} from 'react-native';
import HWKeyboardEvent from 'react-native-hw-keyboard-event';

import {updateDraftMessage} from '@actions/local/draft';
import {userTyping} from '@actions/websocket/users';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {t} from '@i18n';
import EphemeralStore from '@store/ephemeral_store';
import {extractFileInfo} from '@utils/file';
import {switchKeyboardForCodeBlocks} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

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
    updateValue: (value: string) => void;
    addFiles: (files: ExtractedFileInfo[]) => void;
    cursorPosition: number;
    updateCursorPosition: (pos: number) => void;
    sendMessage: () => void;
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
        placeholder = {id: t('create_post.thread_reply'), defaultMessage: 'Reply to this thread...'};
    } else {
        placeholder = {id: t('create_post.write'), defaultMessage: 'Write to {channelDisplayName}'};
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
}: Props) {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const managedConfig = useManagedConfig<ManagedConfig>();

    const lastTypingEventSent = useRef(0);
    const input = useRef<PasteInputRef>();
    const lastNativeValue = useRef('');
    const previousAppState = useRef(AppState.currentState);

    const [keyboardType, setKeyboardType] = useState<KeyboardTypeOptions>('default');
    const [longMessageAlertShown, setLongMessageAlertShown] = useState(false);

    const disableCopyAndPaste = managedConfig.copyAndPasteProtection === 'true';
    const maxHeight = isTablet ? 150 : 88;
    const pasteInputStyle = useMemo(() => {
        return {...style.input, maxHeight};
    }, [maxHeight]);

    const blur = () => {
        input.current?.blur();
    };

    const handleAndroidKeyboard = () => {
        blur();
    };

    const onBlur = useCallback(() => {
        updateDraftMessage(serverUrl, channelId, rootId, value);
    }, [channelId, rootId, value]);

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

        if (Platform.OS === 'ios') {
            const newKeyboardType = switchKeyboardForCodeBlocks(value, cp);
            setKeyboardType(newKeyboardType);
        }

        updateCursorPosition(cp);
    }, [updateCursorPosition, cursorPosition]);

    const handleTextChange = useCallback((newValue: string) => {
        updateValue(newValue);
        lastNativeValue.current = newValue;

        checkMessageLength(newValue);

        // Workaround to avoid iOS emdash autocorrect in Code Blocks
        if (Platform.OS === 'ios') {
            handlePostDraftSelectionChanged(null, true);
        }

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
        handlePostDraftSelectionChanged,
        timeBetweenUserTypingUpdatesMilliseconds,
        channelId,
        rootId,
        (membersInChannel < maxNotificationsPerChannel) && enableUserTypingMessage,
    ]);

    const onPaste = useCallback(async (error: string | null | undefined, files: PastedFile[]) => {
        if (error) {
            showPasteFilesErrorDialog(intl);
        }

        addFiles(await extractFileInfo(files));
    }, [addFiles, intl]);

    const handleHardwareEnterPress = useCallback((keyEvent: {pressedKey: string}) => {
        const topScreen = EphemeralStore.getNavigationTopComponentId();
        let sourceScreen = Screens.CHANNEL;
        if (rootId) {
            sourceScreen = Screens.THREAD;
        } else if (isTablet) {
            sourceScreen = Screens.HOME;
        }
        if (topScreen === sourceScreen) {
            switch (keyEvent.pressedKey) {
                case 'enter':
                    sendMessage();
                    break;
                case 'shift-enter':
                    updateValue(value.substring(0, cursorPosition) + '\n' + value.substring(cursorPosition));
                    updateCursorPosition(cursorPosition + 1);
                    break;
            }
        }
    }, [sendMessage, updateValue, value, cursorPosition, isTablet]);

    const onAppStateChange = useCallback((appState: AppStateStatus) => {
        if (appState !== 'active' && previousAppState.current === 'active') {
            updateDraftMessage(serverUrl, channelId, rootId, value);
        }

        previousAppState.current = appState;
    }, [serverUrl, channelId, rootId, value]);

    useEffect(() => {
        let keyboardListener: EmitterSubscription | undefined;
        if (Platform.OS === 'android') {
            keyboardListener = Keyboard.addListener('keyboardDidHide', handleAndroidKeyboard);
        }

        return (() => {
            keyboardListener?.remove();
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
                input.current?.focus();
            }
        });
        return () => listener.remove();
    }, [updateValue, value, channelId, rootId]);

    useEffect(() => {
        if (value !== lastNativeValue.current) {
            // May change when we implement Fabric
            input.current?.setNativeProps({
                text: value,
            });
            lastNativeValue.current = value;
        }
    }, [value]);

    useEffect(() => {
        const listener = HWKeyboardEvent.onHWKeyPressed(handleHardwareEnterPress);
        return () => {
            listener.remove();
        };
    }, [handleHardwareEnterPress]);

    useDidUpdate(() => {
        if (!value) {
            if (Platform.OS === 'android') {
                // Fixes the issue where Android predictive text would prepend suggestions to the post draft when messages
                // are typed successively without blurring the input
                setKeyboardType('email-address');
            }
        }
    }, [value]);

    useDidUpdate(() => {
        if (Platform.OS === 'android' && keyboardType === 'email-address') {
            setKeyboardType('default');
        }
    }, [keyboardType]);

    return (
        <PasteableTextInput
            allowFontScaling={true}
            testID={testID}
            ref={input}
            disableCopyPaste={disableCopyAndPaste}
            style={pasteInputStyle}
            onChangeText={handleTextChange}
            onSelectionChange={handlePostDraftSelectionChanged}
            placeholder={intl.formatMessage(getPlaceHolder(rootId), {channelDisplayName})}
            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
            multiline={true}
            onBlur={onBlur}
            blurOnSubmit={false}
            underlineColorAndroid='transparent'
            keyboardType={keyboardType}
            onPaste={onPaste}
            disableFullscreenUI={true}
            textContentType='none'
            keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
        />
    );
}
