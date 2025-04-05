// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';

import {selectAttachmentMenuAction} from '@actions/remote/integrations';
import AutocompleteSelector from '@components/autocomplete_selector';
import {useServerUrl} from '@context/server';
import {filterOptions} from '@utils/message_attachment';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    dataSource?: string;
    defaultOption?: string;
    disabled?: boolean;
    id: string;
    name: string;
    options?: PostActionOption[];
    postId: string;
    location: AvailableScreens;
}

const ActionMenu = ({
    dataSource,
    defaultOption,
    disabled,
    id,
    name,
    options,
    postId,
    location,
}: Props) => {
    const serverUrl = useServerUrl();

    const filteredOptions = useMemo(() => {
        return filterOptions(options);
    }, [options]);

    const [selected, setSelected] = useState(() => {
        if (defaultOption && options) {
            return options.find((option) => option.value === defaultOption)?.value;
        }
        return undefined;
    });

    const handleSelect = useCallback(async (selectedItem: SelectedDialogOption) => {
        if (!selectedItem || Array.isArray(selectedItem)) {
            return;
        }

        const result = await selectAttachmentMenuAction(serverUrl, postId, id, selectedItem.value);
        if (result.data?.trigger_id) {
            setSelected(selectedItem.value);
        }
    }, [id, postId, serverUrl]);

    return (
        <AutocompleteSelector
            placeholder={name}
            dataSource={dataSource}
            isMultiselect={false}
            options={filteredOptions}
            selected={selected}
            onSelected={handleSelect}
            disabled={disabled}
            testID={`message_attachment.${name}`}
            location={location}
        />
    );
};

export default ActionMenu;
