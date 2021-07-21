// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import AutocompleteSelector from '@components/autocomplete_selector';
import {PostActionOption} from '@mm-redux/types/integration_actions';

type Props = {
    dataSource?: string;
    defaultOption?: string;
    disabled?: boolean;
    id: string;
    name: string;
    options?: PostActionOption[];
    postId: string;
    selectAttachmentMenuAction: (postId: string, actionId: string, text: string, value: string) => void;
    selected?: PostActionOption;
}

const ActionMenu = ({dataSource, defaultOption, disabled, id, name, options, postId, selectAttachmentMenuAction, selected}: Props) => {
    let isSelected: PostActionOption | undefined;
    if (defaultOption && options) {
        isSelected = options.find((option) => option.value === defaultOption);
    }

    if (selected) {
        isSelected = selected;
    }

    const handleSelect = (selectedItem?: PostActionOption) => {
        if (!selectedItem) {
            return;
        }

        selectAttachmentMenuAction(postId, id, selectedItem.text, selectedItem.value);
    };

    return (
        <AutocompleteSelector
            placeholder={name}
            dataSource={dataSource}
            options={options}
            selected={isSelected}
            onSelected={handleSelect}
            disabled={disabled}
        />
    );
};

export default ActionMenu;
