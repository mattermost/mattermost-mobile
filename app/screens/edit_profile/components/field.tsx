// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps, memo, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform, type TextInputProps, View} from 'react-native';

import FloatingTextInput from '@components/floating_text_input_label';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';

export type FieldProps = TextInputProps & {
    isDisabled?: boolean;
    fieldKey: string;
    label: string;
    maxLength?: number;
    onTextChange: (fieldKey: string, value: string) => void;
    isOptional?: boolean;
    testID: string;
    error?: string;
    value: string;
    fieldRef: ComponentProps<typeof FloatingTextInput>['ref'];
    onFocusNextField: (fieldKey: string) => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        viewContainer: {
            marginVertical: 8,
            alignItems: 'center',
            width: '100%',
        },
        disabledStyle: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
    };
});

const Field = ({
    autoCapitalize = 'none',
    autoCorrect = false,
    fieldKey,
    isDisabled = false,
    isOptional = false,
    keyboardType = 'default',
    label,
    maxLength,
    onTextChange,
    testID,
    value,
    fieldRef,
    error,
    onFocusNextField,
    ...props
}: FieldProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();

    const onChangeText = useCallback((text: string) => onTextChange(fieldKey, text), [fieldKey, onTextChange]);

    const onSubmitEditing = useCallback(() => {
        onFocusNextField(fieldKey);
    }, [fieldKey, onFocusNextField]);

    const style = getStyleSheet(theme);

    const keyboard = (Platform.OS === 'android' && keyboardType === 'url') ? 'default' : keyboardType;

    const optionalText = intl.formatMessage({id: 'channel_modal.optional', defaultMessage: '(optional)'});

    const formattedLabel = isOptional ? `${label} ${optionalText}` : label;

    const subContainer = [style.viewContainer, {paddingHorizontal: isTablet ? 42 : 20}];
    const fieldInputTestId = isDisabled ? `${testID}.input.disabled` : `${testID}.input`;

    return (
        <View
            testID={testID}
            style={subContainer}
        >
            <FloatingTextInput
                autoCapitalize={autoCapitalize}
                autoCorrect={autoCorrect}
                disableFullscreenUI={true}
                editable={!isDisabled}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                keyboardType={keyboard}
                label={formattedLabel}
                maxLength={maxLength}
                onChangeText={onChangeText}
                testID={fieldInputTestId}
                theme={theme}
                error={error}
                value={value}
                ref={fieldRef}
                onSubmitEditing={onSubmitEditing}
                {...props}
            />
        </View>
    );
};

export default memo(Field);
