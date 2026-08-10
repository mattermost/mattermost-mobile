// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useEffect, useMemo} from 'react';

import AutocompleteSelector from '@components/autocomplete_selector';
import RadioSetting from '@components/settings/radio_setting';
import {View as ViewConstants} from '@constants';

import {MmBlocksInteractionsDisabledContext, MmBlocksLookupContext, MmBlocksRenderContext} from './context';
import {useMmBlocksForm} from './form';

import type {ActionHandler} from './types';

type SelectInputElementProps = {
    element: MmSelectInputBlock;
    onAction: ActionHandler;
};

function flattenSelectOptions(element: MmSelectInputBlock): MmStaticSelectOption[] {
    if (element.option_groups?.length) {
        return element.option_groups.flatMap((group) => group.options);
    }
    return element.options ?? [];
}

function initialMultiValue(element: MmSelectInputBlock): string[] {
    if (element.initial_options?.length) {
        return [...element.initial_options];
    }
    if (element.initial_option) {
        return [element.initial_option];
    }
    return [];
}

function normalizeMultiValue(value: unknown, fallback: string[]): string[] {
    if (Array.isArray(value)) {
        return value.map(String);
    }
    return fallback;
}

export const SelectInputElement = ({element, onAction}: SelectInputElementProps) => {
    const interactionsDisabled = useContext(MmBlocksInteractionsDisabledContext);
    const onLookup = useContext(MmBlocksLookupContext);
    const renderContext = useContext(MmBlocksRenderContext);
    const {values, errors, setValue, setDefaultValue} = useMmBlocksForm();

    const disabled = interactionsDisabled || element.disabled === true;
    const multiselect = element.multiselect === true;
    const isExpanded = element.style === 'expanded';
    const isUserSource = element.data_source === 'users';
    const isChannelSource = element.data_source === 'channels';
    const isLookupSource = element.data_source === 'dynamic' && Boolean(element.data_source_action) && Boolean(onLookup);
    const isDynamicSource = isUserSource || isChannelSource;

    const flatOptions = useMemo(() => flattenSelectOptions(element), [element]);

    useEffect(() => {
        if (multiselect) {
            setDefaultValue(element.name, initialMultiValue(element));
        } else {
            setDefaultValue(element.name, element.initial_option ?? '');
        }

        // Seeding runs once per field: initial_option(s) never change after mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [element.name, setDefaultValue]);

    const rawValue = values[element.name];
    const singleValue = typeof rawValue === 'string' ? rawValue : (element.initial_option ?? '');
    const multiValue = useMemo(
        () => normalizeMultiValue(rawValue, initialMultiValue(element)),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- identity tied to raw value / initial option(s)
        [rawValue, element.initial_option, element.initial_options],
    );

    const commitValue = useCallback((next: string | string[]) => {
        setValue(element.name, next);

        if (!element.onChange || interactionsDisabled) {
            return;
        }

        onAction({
            actionId: element.onChange,
            formValues: {...values, [element.name]: next},
        });
    }, [element.name, element.onChange, interactionsDisabled, onAction, setValue, values]);

    const handleExpandedChange = useCallback((value: string | string[]) => {
        commitValue(value);
    }, [commitValue]);

    const handleAutocompleteSelected = useCallback((selected: SelectedDialogOption) => {
        if (!selected) {
            commitValue(multiselect ? [] : '');
            return;
        }
        if (Array.isArray(selected)) {
            commitValue(selected.map((option) => option.value));
            return;
        }
        commitValue(selected.value);
    }, [commitValue, multiselect]);

    const getDynamicOptions = useCallback(async (userInput = ''): Promise<DialogOption[]> => {
        if (!onLookup || !element.data_source_action || interactionsDisabled) {
            return [];
        }
        return onLookup(element.data_source_action, userInput, values);
    }, [element.data_source_action, interactionsDisabled, onLookup, values]);

    if (!element.name || !renderContext) {
        return null;
    }

    const hasStaticOptions = flatOptions.length > 0;
    if (!isDynamicSource && !isLookupSource && !hasStaticOptions) {
        return null;
    }

    // Expanded static selects render inline: radio for single, circular checklist for multi.
    if (isExpanded && !isDynamicSource && !isLookupSource) {
        return (
            <RadioSetting
                label={element.label ?? ''}
                helpText={element.help_text}
                errorText={errors[element.name]}
                options={flatOptions}
                value={multiselect ? multiValue : singleValue}
                onChange={handleExpandedChange}
                multiselect={multiselect}
                optional={element.optional === true}
                disabled={disabled}
                testID={`mm_blocks.select_input.${element.name}`}
                location={renderContext.location}
            />
        );
    }

    let dataSource: string | undefined;
    if (isLookupSource) {
        dataSource = ViewConstants.DATA_SOURCE_DYNAMIC;
    } else if (isDynamicSource) {
        dataSource = element.data_source;
    }

    return (
        <AutocompleteSelector
            label={element.label ?? ''}
            dataSource={dataSource}
            options={isDynamicSource || isLookupSource ? undefined : flatOptions}
            getDynamicOptions={isLookupSource ? getDynamicOptions : undefined}
            optional={element.optional === true}
            onSelected={handleAutocompleteSelected}
            helpText={element.help_text}
            errorText={errors[element.name]}
            placeholder={element.placeholder}
            selected={multiselect ? multiValue : singleValue}
            disabled={disabled}
            isMultiselect={multiselect}
            testID={`mm_blocks.select_input.${element.name}`}
            location={renderContext.location}
        />
    );
};
