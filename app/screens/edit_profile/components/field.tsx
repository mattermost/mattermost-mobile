// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MessageDescriptor} from '@formatjs/intl/src/types';
import React, {RefObject, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StyleSheet, TextInputProps, View} from 'react-native';

import FloatingTextInput, {FloatingTextInputRef} from '@components/floating_text_input_label';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {getKeyboardAppearanceFromTheme} from '@utils/theme';

import FieldDescription from './field_description';

type FieldProps = TextInputProps & {
    isDisabled?: boolean;
    fieldDescription?: string;
    fieldKey: string;
    label: MessageDescriptor | string;
    maxLength?: number;
    onTextChange: (fieldKey: string, value: string) => void;
    isOptional?: boolean;
    testID: string;
    value: string;
    fieldRef: RefObject<FloatingTextInputRef>;
    onFocusNextField: (fieldKey: string) => void;
};

const getStyleSheet = (isTablet: boolean) => {
    return StyleSheet.create({
        viewContainer: {
            marginVertical: 7,
            alignItems: 'center',
            width: '100%',
        },
        subContainer: {
            width: '100%',
            paddingHorizontal: isTablet ? 42 : 20,
        },
    });
};

const Field = ({
    autoCapitalize = 'none',
    autoCorrect = false,
    fieldDescription,
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
    onFocusNextField,
    ...props
}: FieldProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();

    const onChangeText = useCallback((text: string) => onTextChange(fieldKey, text), [fieldKey, onTextChange]);

    const onSubmitEditing = () => {
        onFocusNextField(fieldKey);
    };

    const style = getStyleSheet(isTablet);

    const keyboard = (Platform.OS === 'android' && keyboardType === 'url') ? 'default' : keyboardType;

    const labelText = typeof label === 'string' ? label : intl.formatMessage(label);

    const optionalText = isOptional ? intl.formatMessage({
        id: 'channel_modal.optional',
        defaultMessage: '(optional)',
    }) : ' *';

    const formattedLabel = labelText + optionalText;

    return (
        <View
            testID={testID}
            style={style.viewContainer}
        >
            <View style={style.subContainer}>
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
                    testID={`${testID}.input`}
                    theme={theme}
                    value={value}
                    ref={fieldRef}
                    onSubmitEditing={onSubmitEditing}
                    {...props}
                />
                {isDisabled && (
                    <FieldDescription
                        text={fieldDescription}
                    />
                )}
            </View>
        </View>
    );
};

export default Field;
