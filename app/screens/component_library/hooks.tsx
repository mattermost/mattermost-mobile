// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';

import AutocompleteSelector from '@components/autocomplete_selector';
import BoolSetting from '@components/settings/bool_setting';
import TextSetting from '@components/settings/text_setting';
import {Screens} from '@constants';

type HookResult<T> = [
    {[x: string]: T},
    JSX.Element,
]
export const useStringProp = (
    propName: string,
    defaultValue: string,
    isTextarea: boolean,
): HookResult<string> => {
    const [value, setValue] = useState(defaultValue);
    const selector = useMemo(() => (
        <TextSetting
            label={propName}
            multiline={isTextarea}
            disabled={false}
            keyboardType='default'
            onChange={setValue}
            optional={false}
            secureTextEntry={false}
            testID={`${propName}.input`}
            value={value}
            location={Screens.COMPONENT_LIBRARY}
        />
    ), [value, propName, isTextarea]);
    const preparedProp = useMemo(() => ({[propName]: value}), [propName, value]);

    return [preparedProp, selector];
};

export const useBooleanProp = (
    propName: string,
    defaultValue: boolean,
): HookResult<boolean> => {
    const [value, setValue] = useState(defaultValue);
    const selector = useMemo(() => (
        <BoolSetting
            onChange={setValue}
            testID={`${propName}.input`}
            value={value}
            label={propName}
            location={Screens.COMPONENT_LIBRARY}
        />
    ), [propName, value]);
    const preparedProp = useMemo(() => ({[propName]: value}), [propName, value]);

    return [preparedProp, selector];
};

const ALL_OPTION = 'ALL';
type DropdownHookResult = [
    {[x: string]: string} | undefined,
    {[x: string]: string[]} | undefined,
    JSX.Element,
];
export const useDropdownProp = (
    propName: string,
    defaultValue: string,
    options: string[],
    allowAll: boolean,
): DropdownHookResult => {
    const [value, setValue] = useState(defaultValue);
    const onChange = useCallback((v: SelectedDialogOption) => {
        if (!v) {
            setValue(defaultValue);
            return;
        }
        if (Array.isArray(v)) {
            setValue(v[0].value);
            return;
        }

        setValue(v.value);
    }, [defaultValue]);

    const renderedOptions = useMemo(() => {
        const toReturn: DialogOption[] = options.map((v) => ({
            value: v,
            text: v,
        }));
        if (allowAll) {
            toReturn.unshift({
                value: ALL_OPTION,
                text: ALL_OPTION,
            });
        }
        return toReturn;
    }, [options, allowAll]);
    const selector = useMemo(() => (
        <AutocompleteSelector
            testID={`${propName}.input`}
            label={propName}
            onSelected={onChange}
            options={renderedOptions}
            selected={value}
            location={Screens.COMPONENT_LIBRARY}
        />
    ), [onChange, propName, renderedOptions, value]);
    const preparedProp = useMemo(() => (value === ALL_OPTION ? undefined : ({[propName]: value})), [propName, value]);
    const preparedPossibilities = useMemo(() => (value === ALL_OPTION ? ({[propName]: options}) : undefined), [propName, value, options]);
    return [preparedProp, preparedPossibilities, selector];
};
