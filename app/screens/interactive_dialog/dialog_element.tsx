// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import AutocompleteSelector from '@components/autocomplete_selector';
import BoolSetting from '@components/settings/bool_setting';
import RadioSetting from '@components/settings/radio_setting';
import TextSetting from '@components/settings/text_setting';
import {selectKeyboardType as selectKB} from '@utils/integrations';

import type {KeyboardTypeOptions} from 'react-native';

const TEXT_DEFAULT_MAX_LENGTH = 150;
const TEXTAREA_DEFAULT_MAX_LENGTH = 3000;

function selectKeyboardType(type: InteractiveDialogElementType, subtype?: InteractiveDialogTextSubtype): KeyboardTypeOptions {
    if (type === 'textarea') {
        return 'default';
    }

    return selectKB(subtype);
}

type Props = {
    displayName: string;
    name: string;
    type: InteractiveDialogElementType;
    subtype?: InteractiveDialogTextSubtype;
    placeholder?: string;
    helpText?: string;
    errorText?: string;
    maxLength?: number;
    dataSource?: string;
    optional?: boolean;
    options?: PostActionOption[];
    value: string|number|boolean|string[];
    onChange: (name: string, value: string|number|boolean|string[]) => void;
}
function DialogElement({
    displayName,
    name,
    type,
    subtype,
    placeholder,
    helpText,
    errorText,
    maxLength,
    dataSource,
    optional = false,
    options,
    value,
    onChange,
}: Props) {
    const testID = `InteractiveDialogElement.${name}`;
    const handleChange = useCallback((newValue: string | boolean | string[]) => {
        if (type === 'text' && subtype === 'number') {
            onChange(name, parseInt(newValue as string, 10));
            return;
        }
        onChange(name, newValue);
    }, [onChange, type, subtype]);

    const handleSelect = useCallback((newValue: DialogOption | undefined) => {
        if (!newValue) {
            onChange(name, '');
            return;
        }

        onChange(name, newValue.value);
    }, [onChange]);

    switch (type) {
        case 'text':
        case 'textarea':
            return (
                <TextSetting
                    label={displayName}
                    maxLength={maxLength || (type === 'text' ? TEXT_DEFAULT_MAX_LENGTH : TEXTAREA_DEFAULT_MAX_LENGTH)}
                    value={value as string}
                    placeholder={placeholder}
                    helpText={helpText}
                    errorText={errorText}
                    onChange={handleChange}
                    optional={optional}
                    multiline={type === 'textarea'}
                    keyboardType={selectKeyboardType(type, subtype)}
                    secureTextEntry={subtype === 'password'}
                    disabled={false}
                    testID={testID}
                />
            );
        case 'select':
            return (
                <AutocompleteSelector
                    label={displayName}
                    dataSource={dataSource}
                    options={options}
                    optional={optional}
                    onSelected={handleSelect}
                    helpText={helpText}
                    errorText={errorText}
                    placeholder={placeholder}
                    showRequiredAsterisk={true}
                    selected={value as string}
                    roundedBorders={false}
                    testID={testID}
                />
            );
        case 'radio':
            return (
                <RadioSetting
                    label={displayName}
                    helpText={helpText}
                    errorText={errorText}
                    options={options}
                    onChange={handleChange}
                    testID={testID}
                    value={value as string}
                />
            );
        case 'bool':
            return (
                <BoolSetting
                    label={displayName}
                    value={value as boolean}
                    placeholder={placeholder}
                    helpText={helpText}
                    errorText={errorText}
                    optional={optional}
                    onChange={handleChange}
                    testID={testID}
                />
            );
        default:
            return null;
    }
}

export default DialogElement;
