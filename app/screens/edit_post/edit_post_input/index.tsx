// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import PasteInput, {type PasteInputRef} from '@mattermost/react-native-paste-input';
import React, {forwardRef, useCallback, useImperativeHandle, useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {type NativeSyntheticEvent, Platform, type TextInputSelectionChangeEventData, View} from 'react-native';

import {ExtraKeyboard, useExtraKeyboardContext} from '@context/extra_keyboard';
import {useTheme} from '@context/theme';
import {emptyFunction} from '@utils/general';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    input: {
        color: theme.centerChannelColor,
        padding: 15,
        textAlignVertical: 'top',
        flex: 1,
        ...typography('Body', 200),
    },
    inputContainer: {
        backgroundColor: theme.centerChannelBg,
        marginTop: 2,
        flex: 1,
    },
}));

export type EditPostInputRef = {
    focus: () => void;
}

type PostInputProps = {
    message: string;
    hasError: boolean;
    onTextSelectionChange: (curPos: number) => void;
    onChangeText: (text: string) => void;
}

const EditPostInput = forwardRef<EditPostInputRef, PostInputProps>(({
    message,
    onChangeText,
    onTextSelectionChange,
    hasError,
}: PostInputProps, ref) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const managedConfig = useManagedConfig<ManagedConfig>();
    const disableCopyAndPaste = managedConfig.copyAndPasteProtection === 'true';

    const inputRef = useRef<PasteInputRef>();

    const keyboardContext = useExtraKeyboardContext();

    const onFocus = useCallback(() => {
        keyboardContext?.registerTextInputFocus();
    }, [keyboardContext]);

    const onBlur = useCallback(() => {
        keyboardContext?.registerTextInputBlur();
    }, [keyboardContext]);

    const inputStyle = useMemo(() => {
        return [styles.input];
    }, [styles]);

    const onSelectionChange = useCallback((event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        const curPos = event.nativeEvent.selection.end;
        onTextSelectionChange(curPos);
    }, [onTextSelectionChange]);

    const containerStyle = useMemo(() => [
        styles.inputContainer,
        hasError && {marginTop: 0},
    ], [styles, hasError]);

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
    }), []);

    return (
        <View style={containerStyle}>
            <PasteInput
                allowFontScaling={true}
                disableCopyPaste={disableCopyAndPaste}
                disableFullscreenUI={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                multiline={true}
                onChangeText={onChangeText}
                onPaste={emptyFunction}
                onSelectionChange={onSelectionChange}
                placeholder={intl.formatMessage({id: 'edit_post.editPost', defaultMessage: 'Edit the post...'})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                ref={inputRef}
                smartPunctuation='disable'
                submitBehavior='newline'
                style={inputStyle}
                testID='edit_post.message.input'
                underlineColorAndroid='transparent'
                value={message}
                onFocus={onFocus}
                onBlur={onBlur}
            />
            {Platform.select({ios: <ExtraKeyboard/>})}
        </View>
    );
});

EditPostInput.displayName = 'EditPostInput';

export default EditPostInput;
