// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import PasteableTextInput, {PastedFile, PasteInputRef} from '@mattermost/react-native-paste-input';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {Alert, DeviceEventEmitter, EmitterSubscription, findNodeHandle, Keyboard, KeyboardTypeOptions, NativeModules, NativeSyntheticEvent, Platform, TextInput, TextInputSelectionChangeEventData} from 'react-native';
import HWKeyboardEvent from 'react-native-hw-keyboard-event';

import {userTyping} from '@actions/websocket/user';
import {BLUR_POST_DRAFT_EVENT} from '@constants/post_draft';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import EphemeralStore from '@store/ephemeral_store';
import {extractFileInfos} from '@utils/file';
import {switchKeyboardForCodeBlocks} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

const {RNTextInputReset} = NativeModules;
const INPUT_LINE_HEIGHT = 20;

const HW_SHIFT_ENTER_TEXT = Platform.OS === 'ios' ? '\n' : '';
const HW_EVENT_IN_SCREEN = ['Channel', 'Thread'];

type Props = {
    testID?: string;
    channelDisplayName?: string;
    channelId: string;
    maxMessageLength: number;
    rootId: string;
    timeBetweenUserTypingUpdatesMilliseconds: number;
    value: string;
    updateValue: (value: string) => void;
    addFiles: (files: FileInfo[]) => void;
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

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    input: {
        color: theme.centerChannelColor,
        fontSize: 15,
        lineHeight: INPUT_LINE_HEIGHT,
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
    const managedConfig = useManagedConfig();

    const lastTypingEventSent = useRef(0);
    const input = useRef<PasteInputRef>();
    const lastNativeValue = useRef('');

    const [keyboardType, setKeyboardType] = useState<KeyboardTypeOptions>('default');
    const [longMessageAlertShown, setLongMessageAlertShown] = useState(false);

    const disableCopyAndPaste = managedConfig.copyAndPasteProtection === 'true';
    const maxHeight = isTablet ? 150 : 88;

    const blur = () => {
        input.current?.blur();
    };

    const handleAndroidKeyboard = () => {
        blur();
    };

    const getPlaceHolder = () => {
        let placeholder;

        if (rootId) {
            placeholder = {id: t('create_comment.addComment'), defaultMessage: 'Add a comment...'};
        } else {
            placeholder = {id: t('create_post.write'), defaultMessage: 'Write to {channelDisplayName}'};
        }

        return placeholder;
    };

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

        if (newValue && lastTypingEventSent.current + timeBetweenUserTypingUpdatesMilliseconds < Date.now()) {
            userTyping(serverUrl, channelId, rootId);
            lastTypingEventSent.current = Date.now();
        }
    }, [updateValue, checkMessageLength, handlePostDraftSelectionChanged, timeBetweenUserTypingUpdatesMilliseconds, channelId, rootId]);

    const onPaste = useCallback(async (error: string | null | undefined, files: PastedFile[]) => {
        if (error) {
            showPasteFilesErrorDialog(intl);
        }

        addFiles(await extractFileInfos(files));
    }, [addFiles, intl]);

    const handleHardwareEnterPress = useCallback((keyEvent: {pressedKey: string}) => {
        if (HW_EVENT_IN_SCREEN.includes(EphemeralStore.getNavigationTopComponentId())) {
            switch (keyEvent.pressedKey) {
                case 'enter':
                    sendMessage();
                    break;
                case 'shift-enter':
                    updateValue(value.substr(0, cursorPosition) + HW_SHIFT_ENTER_TEXT + value.substr(cursorPosition));
                    updateCursorPosition(cursorPosition + 1);
                    break;
            }
        }
    }, [sendMessage, updateValue, value, cursorPosition]);

    useEffect(() => {
        const blurListener = DeviceEventEmitter.addListener(BLUR_POST_DRAFT_EVENT, blur);

        let keyboardListener: EmitterSubscription | undefined;
        if (Platform.OS === 'android') {
            keyboardListener = Keyboard.addListener('keyboardDidHide', handleAndroidKeyboard);
        }

        return (() => {
            blurListener.remove();
            keyboardListener?.remove();
        });
    }, []);

    useEffect(() => {
        if (value !== lastNativeValue.current) {
            input.current?.setNativeProps({
                text: value,
                selection: {start: cursorPosition},
            });
            lastNativeValue.current = value;

            // Workaround for some Android keyboards that don't play well with cursors (e.g. Samsung keyboards)
            if (input?.current && Platform.OS === 'android') {
                RNTextInputReset.resetKeyboardInput(findNodeHandle(input.current as TextInput));
            }
        }
    }, [value, input.current]);

    useEffect(() => {
        HWKeyboardEvent.onHWKeyPressed(handleHardwareEnterPress);
        return () => {
            HWKeyboardEvent.removeOnHWKeyPressed();
        };
    }, [handleHardwareEnterPress]);

    return (
        <PasteableTextInput
            allowFontScaling={true}
            testID={testID}
            ref={input}
            disableCopyPaste={disableCopyAndPaste}
            style={{...style.input, maxHeight}}
            onChangeText={handleTextChange}
            onSelectionChange={handlePostDraftSelectionChanged}
            placeholder={intl.formatMessage(getPlaceHolder(), {channelDisplayName})}
            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
            multiline={true}
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
