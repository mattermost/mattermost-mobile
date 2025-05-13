// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';

import AutocompleteSelector from '@components/autocomplete_selector';
import BoolSetting from '@components/settings/bool_setting';
import RadioSetting from '@components/settings/radio_setting';
import TextSetting from '@components/settings/text_setting';
import {Screens} from '@constants';
import {selectKeyboardType as selectKB} from '@utils/integrations';
import {filterOptions} from '@utils/message_attachment';

import type {KeyboardTypeOptions} from 'react-native';

const TEXT_DEFAULT_MAX_LENGTH = 150;
const TEXTAREA_DEFAULT_MAX_LENGTH = 3000;

function selectKeyboardType(type: InteractiveDialogElementType, subtype?: InteractiveDialogTextSubtype): KeyboardTypeOptions {
    if (type === 'textarea') {
        return 'default';
    }

    return selectKB(subtype);
}

function getStringValue(value: string | number | boolean | string[] | undefined): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return value.toString();
    }

    return undefined;
}

function getBooleanValue(value: string | number | boolean | string[] | undefined): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
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
    value?: string|number|boolean|string[];
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
            const number = parseInt(newValue as string, 10);
            onChange(name, isNaN(number) ? '' : number);
            return;
        }
        onChange(name, newValue);
    }, [type, subtype, onChange, name]);

    const handleSelect = useCallback((newValue: DialogOption | undefined) => {
        if (!newValue) {
            onChange(name, '');
            return;
        }

        onChange(name, newValue.value);
    }, [name, onChange]);

    const filteredOptions = useMemo(() => {
        return filterOptions(options);
    }, [options]);

    switch (type) {
        case 'text':
        case 'textarea':
            return (
                <TextSetting
                    label={displayName}
                    maxLength={maxLength || (type === 'text' ? TEXT_DEFAULT_MAX_LENGTH : TEXTAREA_DEFAULT_MAX_LENGTH)}
                    value={getStringValue(value)}
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
                    location={Screens.INTERACTIVE_DIALOG}
                />
            );
        case 'select':
            return (
                <AutocompleteSelector
                    label={displayName}
                    dataSource={dataSource}
                    options={filteredOptions}
                    optional={optional}
                    onSelected={handleSelect}
                    helpText={helpText}
                    errorText={errorText}
                    placeholder={placeholder}
                    showRequiredAsterisk={true}
                    selected={getStringValue(value)}
                    roundedBorders={false}
                    testID={testID}
                    location={Screens.INTERACTIVE_DIALOG}
                />
            );
        case 'radio':
            return (
                <RadioSetting
                    label={displayName}
                    helpText={helpText}
                    errorText={errorText}
                    options={filteredOptions}
                    onChange={handleChange}
                    testID={testID}
                    value={getStringValue(value)}
                    location={Screens.INTERACTIVE_DIALOG}
                />
            );
        case 'bool':
            return (
                <BoolSetting
                    label={displayName}
                    value={getBooleanValue(value)}
                    placeholder={placeholder}
                    helpText={helpText}
                    errorText={errorText}
                    optional={optional}
                    onChange={handleChange}
                    testID={testID}
                    location={Screens.INTERACTIVE_DIALOG}
                />
            );
        default:
            return null;
    }
}

export default DialogElement;
