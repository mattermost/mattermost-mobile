// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useEffect} from 'react';

import BoolSetting from '@components/settings/bool_setting';

import {MmBlocksInteractionsDisabledContext, MmBlocksRenderContext} from './context';
import {useMmBlocksForm} from './form';

import type {ActionHandler} from './types';

type BoolInputElementProps = {
    element: MmBoolInputBlock;
    onAction: ActionHandler;
};

function normalizeBoolValue(value: unknown): boolean {
    return value === true;
}

export const BoolInputElement = ({element, onAction}: BoolInputElementProps) => {
    const interactionsDisabled = useContext(MmBlocksInteractionsDisabledContext);
    const renderContext = useContext(MmBlocksRenderContext);
    const {values, errors, setValue, setDefaultValue} = useMmBlocksForm();

    useEffect(() => {
        if (!element.name) {
            return;
        }
        setDefaultValue(element.name, element.initial_value ?? false);
    }, [element.name, element.initial_value, setDefaultValue]);

    const handleChange = useCallback((value: boolean) => {
        setValue(element.name, value);

        if (!element.onChange || interactionsDisabled) {
            return;
        }

        onAction({
            actionId: element.onChange,
            formValues: {...values, [element.name]: value},
        });
    }, [element.name, element.onChange, interactionsDisabled, onAction, setValue, values]);

    if (!element.name || !element.label.trim() || !renderContext) {
        return null;
    }

    const value = normalizeBoolValue(values[element.name] ?? element.initial_value);

    return (
        <BoolSetting
            label={element.label}
            value={value}
            placeholder={element.placeholder}
            helpText={element.help_text}
            errorText={errors[element.name]}
            optional={element.optional === true}
            disabled={interactionsDisabled || element.disabled === true}
            onChange={handleChange}
            testID={`mm_blocks.bool_input.${element.name}`}
            location={renderContext.location}
        />
    );
};
