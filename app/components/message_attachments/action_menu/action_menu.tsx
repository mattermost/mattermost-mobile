// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import AutocompleteSelector from '@components/autocomplete_selector';
import {PostActionOption} from '@mm-redux/types/integration_actions';

type Props = {
    actions: {
        selectAttachmentMenuAction: (postId: string, actionId: string, text: string, value: string) => void;
    };
    id: string;
    name: string;
    dataSource?: string;
    defaultOption?: string;
    options?: PostActionOption[];
    postId: string;
    selected?: PostActionOption;
    disabled?: boolean;
}

const ActionMenu: React.FC<Props> = (props: Props) => {
    let selected: PostActionOption | undefined;
    if (props.defaultOption && props.options) {
        selected = props.options.find((option) => option.value === props.defaultOption);
    }

    if (props.selected) {
        selected = props.selected;
    }

    const handleSelect = (selectedItem?: PostActionOption) => {
        if (!selectedItem) {
            return;
        }

        const {
            actions,
            id,
            postId,
        } = props;

        actions.selectAttachmentMenuAction(postId, id, selectedItem.text, selectedItem.value);
    };

    const {
        name,
        dataSource,
        options,
        disabled,
    } = props;

    return (
        <AutocompleteSelector
            placeholder={name}
            dataSource={dataSource}
            options={options}
            selected={selected}
            onSelected={handleSelect}
            disabled={disabled}
        />
    );
};

export default ActionMenu;
