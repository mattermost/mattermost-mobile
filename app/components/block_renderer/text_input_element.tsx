// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useEffect, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Footer from '@components/settings/footer';
import Label from '@components/settings/label';
import TextSetting from '@components/settings/text_setting';
import {Screens} from '@constants';
import usePressableOpacityStyle from '@hooks/use_pressable_opacity';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {selectKeyboardType} from '@utils/integrations';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {MmBlocksInteractionsDisabledContext, MmBlocksRenderContext} from './context';
import {useMmBlocksForm, type MmFormValue} from './form';

import type {ActionHandler} from './types';

const TEXT_DEFAULT_MAX_LENGTH = 150;
const TEXTAREA_DEFAULT_MAX_LENGTH = 3000;
const MULTILINE_PREVIEW_LINES = 3;

const messages = defineMessages({
    placeholder: {
        id: 'mm_blocks.text_input.placeholder',
        defaultMessage: 'Enter text',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const baseText = {
        ...typography('Body', 200),
    };

    return {
        container: {
            width: '100%',
            marginTop: 10,
            marginBottom: 2,
        },
        row: {
            borderWidth: 1,
            borderRadius: 5,
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: changeOpacity(theme.centerChannelBg, 0.9),
            justifyContent: 'center',
            minHeight: 40,
            paddingLeft: 10,
            paddingRight: 30,
            paddingVertical: 7,
        },
        value: {
            ...baseText,
            color: theme.centerChannelColor,
        },
        placeholder: {
            ...baseText,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        icon: {
            position: 'absolute',
            top: 10,
            right: 12,
        },
        disabled: {
            opacity: 0.5,
        },
    };
});

type TextInputElementProps = {
    element: MmTextInputBlock;
    onAction: ActionHandler;
    theme: Theme;
};

function isNumberInput(element: MmTextInputBlock): boolean {
    return element.multiline !== true && element.subtype === 'number';
}

/** Number subtypes prefer `number | null`; keep draft/invalid text as string for validation. */
function parseNumberValue(value: unknown): string | number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const text = String(value);

    // In-progress edits (and fully invalid text) must not collapse to null — otherwise
    // required-field validation masks "Must be a number." (MM-T6269).
    if (text === '-' || text === '.' || text === '-.' || (/^-?\d+\.$/).test(text)) {
        return text;
    }
    const parsed = Number(text);
    if (Number.isFinite(parsed)) {
        return parsed;
    }
    return text;
}

function initialTextFormValue(element: MmTextInputBlock): MmFormValue {
    if (isNumberInput(element)) {
        if (element.initial_value === undefined || element.initial_value === '') {
            return null;
        }
        const parsed = Number(element.initial_value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return element.initial_value ?? '';
}

function displayTextValue(rawValue: MmFormValue | undefined, element: MmTextInputBlock): string {
    if (isNumberInput(element)) {
        if (typeof rawValue === 'string') {
            return rawValue;
        }
        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
            return String(rawValue);
        }
        if (rawValue === undefined || rawValue === null) {
            const initial = initialTextFormValue(element);
            return initial === null || initial === undefined ? '' : String(initial);
        }
        return '';
    }
    if (rawValue === undefined || rawValue === null) {
        return element.initial_value ?? '';
    }
    return String(rawValue);
}

export const TextInputElement = ({element, onAction, theme}: TextInputElementProps) => {
    const intl = useIntl();
    const interactionsDisabled = useContext(MmBlocksInteractionsDisabledContext);
    const renderContext = useContext(MmBlocksRenderContext);
    const {values, errors, setValue, setDefaultValue} = useMmBlocksForm();
    const style = getStyleSheet(theme);
    const asNumber = isNumberInput(element);

    useEffect(() => {
        if (!element.name) {
            return;
        }
        setDefaultValue(element.name, initialTextFormValue(element));
    }, [element, setDefaultValue]);

    const handleChange = useCallback((value: string) => {
        const next = asNumber ? parseNumberValue(value) : value;
        setValue(element.name, next);

        if (!element.onChange || interactionsDisabled) {
            return;
        }

        onAction({
            actionId: element.onChange,
            formValues: {...values, [element.name]: next},
        });
    }, [asNumber, element.name, element.onChange, interactionsDisabled, onAction, setValue, values]);

    const disabled = interactionsDisabled || element.disabled === true;
    const maxLength = element.max_length ?? (element.multiline ? TEXTAREA_DEFAULT_MAX_LENGTH : TEXT_DEFAULT_MAX_LENGTH);
    const value = displayTextValue(values[element.name], element);
    const testID = `mm_blocks.text_input.${element.name}`;

    const openTextInputScreen = usePreventDoubleTap(useCallback(() => {
        CallbackStore.setCallback(handleChange);
        navigateToScreen(Screens.MM_BLOCKS_TEXT_INPUT, {
            title: element.label,
            label: element.label ?? '',
            initialValue: value,
            placeholder: element.placeholder,
            multiline: element.multiline === true,
            maxLength,
            subtype: element.subtype,
            optional: element.optional === true,
            helpText: element.help_text,
        });
    }, [element, handleChange, maxLength, value]));

    const rowStyle = usePressableOpacityStyle(useMemo(() => [style.row, disabled && style.disabled], [disabled, style]));

    if (!element.name || !renderContext) {
        return null;
    }

    if (renderContext.context === 'post') {
        const displayValue = element.subtype === 'password' ? '•'.repeat(value.length) : value;

        return (
            <View style={style.container}>
                {Boolean(element.label?.trim()) && (
                    <Label
                        label={element.label ?? ''}
                        optional={element.optional === true}
                        testID={testID}
                    />
                )}
                <Pressable
                    disabled={disabled}
                    onPress={openTextInputScreen}
                    style={rowStyle}
                    testID={`${testID}.edit.button`}
                >
                    <Text
                        numberOfLines={element.multiline ? MULTILINE_PREVIEW_LINES : 1}
                        style={displayValue ? style.value : style.placeholder}
                    >
                        {displayValue || element.placeholder || intl.formatMessage(messages.placeholder)}
                    </Text>
                    <CompassIcon
                        name='pencil-outline'
                        size={20}
                        color={changeOpacity(theme.centerChannelColor, 0.5)}
                        style={style.icon}
                    />
                </Pressable>
                <Footer
                    disabled={disabled}
                    helpText={element.help_text}
                    errorText={errors[element.name]}
                    location={renderContext.location}
                />
            </View>
        );
    }

    return (
        <TextSetting
            label={element.label ?? ''}
            value={value}
            placeholder={element.placeholder}
            helpText={element.help_text}
            errorText={errors[element.name]}
            maxLength={maxLength}
            optional={element.optional === true}
            multiline={element.multiline === true}
            keyboardType={selectKeyboardType(element.subtype)}
            secureTextEntry={element.subtype === 'password'}

            // Use 'oneTimeCode' for password fields so iOS doesn't treat this as a login
            // form and pop the "Save Password?" credential sheet on submit.
            textContentType={element.subtype === 'password' ? 'oneTimeCode' : undefined}
            disabled={disabled}
            onChange={handleChange}
            testID={testID}
            location={renderContext.location}
        />
    );
};
