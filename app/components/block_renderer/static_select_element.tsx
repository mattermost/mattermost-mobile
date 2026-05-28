// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useMemo, useState} from 'react';

import AutocompleteSelector from '@components/autocomplete_selector';
import {usePreventDoubleTap} from '@hooks/utils';
import {filterOptions} from '@utils/message_attachment';

import {MmBlocksInteractionContext, MmBlocksRenderContext} from './context';

import type {ActionHandler} from './types';

type StaticSelectElementProps = {
    element: MmStaticSelectBlock;
    onAction: ActionHandler;
};

export const StaticSelectElement = ({element, onAction}: StaticSelectElementProps) => {
    const {location} = useContext(MmBlocksRenderContext)!;
    const interactionsEnabled = useContext(MmBlocksInteractionContext);
    const filteredOptions = useMemo(() => filterOptions(element.options), [element.options]);
    const [selected, setSelected] = useState(() => {
        if (element.initial_option && element.options) {
            return element.options.find((o) => o.value === element.initial_option)?.value;
        }
        return undefined;
    });

    const isDynamicSource = element.data_source === 'users' || element.data_source === 'channels';
    const optionCount = element.options?.length ?? 0;
    const isValid = Boolean(element.action_id && (isDynamicSource || optionCount > 0));

    const handleSelect = usePreventDoubleTap(useCallback(async (selectedItem: SelectedDialogOption) => {
        if (!selectedItem || Array.isArray(selectedItem) || !element.action_id) {
            return;
        }
        await onAction(element.action_id, selectedItem.value, element.query, element.cookie);
        setSelected(selectedItem.value);
    }, [element.action_id, element.cookie, element.query, onAction]));

    if (!isValid) {
        return null;
    }

    return (
        <AutocompleteSelector
            placeholder={element.placeholder}
            dataSource={element.data_source}
            isMultiselect={false}
            options={filteredOptions}
            selected={selected}
            onSelected={handleSelect}
            disabled={element.disabled || !interactionsEnabled}
            testID={`mm_blocks.static_select.${element.action_id}`}
            location={location}
            omitMargins={true}
        />
    );
};
