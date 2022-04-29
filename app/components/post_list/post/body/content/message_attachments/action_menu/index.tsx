// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';

import {selectAttachmentMenuAction} from '@actions/remote/integrations';
import AutocompleteSelector from '@components/autocomplete_selector';
import {useServerUrl} from '@context/server';

type Props = {
    dataSource?: string;
    defaultOption?: string;
    disabled?: boolean;
    id: string;
    name: string;
    options?: PostActionOption[];
    postId: string;
}

const ActionMenu = ({dataSource, defaultOption, disabled, id, name, options, postId}: Props) => {
    let isSelected: PostActionOption | undefined;
    const serverUrl = useServerUrl();
    if (defaultOption && options) {
        isSelected = options.find((option) => option.value === defaultOption);
    }
    const [selected, setSelected] = useState(isSelected?.value);

    const handleSelect = useCallback(async (selectedItem: string | string[]) => {
        if (Array.isArray(selectedItem)) { // Since AutocompleteSelector is not multiselect, we are sure we only receive a string
            return;
        }

        const result = await selectAttachmentMenuAction(serverUrl, postId, id, selectedItem);
        if (result.data?.trigger_id) {
            setSelected(selectedItem);
        }
    }, []);

    return (
        <AutocompleteSelector
            placeholder={name}
            dataSource={dataSource}
            options={options}
            selected={selected}
            onSelected={handleSelect}
            disabled={disabled}
            testID={`message_attachment.${name}`}
        />
    );
};

export default ActionMenu;
