// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import PasteableTextInput, {PastedFile, PasteInputRef} from '@mattermost/react-native-paste-input';
import React, {useEffect, useRef, useState} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {Alert, DeviceEventEmitter, EmitterSubscription, findNodeHandle, Keyboard, KeyboardTypeOptions, NativeModules, NativeSyntheticEvent, Platform, TextInput, TextInputSelectionChangeEventData} from 'react-native';

import {userTyping} from '@actions/websocket/user';
import {BLUR_POST_DRAFT_EVENT} from '@constants/post_draft';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {switchKeyboardForCodeBlocks} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

const {RNTextInputReset} = NativeModules;
const INPUT_LINE_HEIGHT = 20;

type Props = {
    testID?: string;
    channelDisplayName?: string;
    channelId: string;
    maxMessageLength: number;
    rootId: string;
    timeBetweenUserTypingUpdatesMilliseconds: number;
    value: string;
    updateValue: (value: string) => void;
    updateFiles: (files: FileInfo[]) => void;
    cursorPosition: number;
    updateCursorPosition: (pos: number) => void;
}
export default function PostInput({
    testID,
    channelDisplayName,
    channelId,
    maxMessageLength,
    rootId,
    timeBetweenUserTypingUpdatesMilliseconds,
    value,
    updateValue,
    updateFiles,
    cursorPosition,
    updateCursorPosition,
}: Props) {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const managedConfig = useManagedConfig();
    const lastTypingEventSent = useRef(0);

    const input = useRef<PasteInputRef>();

    const [keyboardType, setKeyboardType] = useState<KeyboardTypeOptions>('default');
    const [longMessageAlertShown, setLongMessageAlertShown] = useState(false);
    const lastNativeValue = useRef('');

    const disableCopyAndPaste = managedConfig.copyAndPasteProtection === 'true';

    // Did Mount
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
    });

    useEffect(() => {
        if (value !== lastNativeValue.current) {
            input.current?.setNativeProps({
                text: value,
            });
            lastNativeValue.current = value;

            // Workaround for some Android keyboards that don't play well with cursors (e.g. Samsung keyboards)
            if (input?.current && Platform.OS === 'android') {
                RNTextInputReset.resetKeyboardInput(findNodeHandle(input.current as TextInput));
            }
        }
    }, [value, input.current]);

    // Aux
    const blur = () => {
        input.current?.blur();
    };

    const focus = () => {
        input.current?.focus();
    };

    const checkMessageLength = (newValue: string) => {
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

    const handleAndroidKeyboard = () => {
        blur();
    };

    const handlePostDraftSelectionChanged = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData> | null, fromHandleTextChange = false) => {
        const cp = fromHandleTextChange ? cursorPosition : event!.nativeEvent.selection.end;

        if (Platform.OS === 'ios') {
            const newKeyboardType = switchKeyboardForCodeBlocks(value, cp);
            setKeyboardType(newKeyboardType);
        }

        updateCursorPosition(cp);
    };

    const handleTextChange = (newValue: string) => {
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
    };

    const onPaste = (error: string | null | undefined, files: PastedFile[]) => {
        if (error) {
            showPasteFilesErrorDialog(intl);
        }

        //updateFiles(files)
    };

    // Render
    const placeholder = getPlaceHolder();

    const maxHeight = isTablet ? 150 : 88;

    return (
        <PasteableTextInput
            allowFontScaling={true}
            testID={testID}
            ref={input}
            disableCopyPaste={disableCopyAndPaste}
            style={{...style.input, maxHeight}}
            onChangeText={handleTextChange}
            onSelectionChange={handlePostDraftSelectionChanged}
            placeholder={intl.formatMessage(placeholder, {channelDisplayName})}
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

