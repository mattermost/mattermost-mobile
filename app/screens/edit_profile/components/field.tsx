// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MessageDescriptor} from '@formatjs/intl/src/types';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Platform, KeyboardTypeOptions} from 'react-native';

import FloatingTextInput from '@components/floating_text_input_label';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

import FieldDescription from './field_description';

type FieldProps = {
    isDisabled?: boolean;
    fieldDescription?: string;
    id: string;
    keyboardType?: KeyboardTypeOptions;
    label: MessageDescriptor | string;
    maxLength?: number;
    onChange: (id: string, value: string) => void;
    isOptional?: boolean;
    testID: string;
    value: string;
};

const Field = ({
    isDisabled = false,
    fieldDescription,
    id,
    keyboardType = 'default',
    label,
    maxLength,
    onChange,
    isOptional = false,
    testID,
    value,
}: FieldProps) => {
    const theme = useTheme();
    const intl = useIntl();

    const onChangeText = useCallback(
        (text: string) => {
            return onChange(id, text);
        },
        [id, onChange],
    );

    const style = getStyleSheet(theme);

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
                    autoCapitalize='none'
                    autoCorrect={false}
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
                />
                {isDisabled && fieldDescription && (
                    <FieldDescription
                        text={fieldDescription}
                    />
                )}
            </View>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        viewContainer: {
            marginVertical: 7,
            alignItems: 'center',
            width: '100%',
        },
        subContainer: {
            width: '84%',
        },
    };
});
export default Field;
