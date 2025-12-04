// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import BaseChip from './base_chip';

type SelectedChipProps = {
    id: string;
    text: string;
    onRemove: (id: string) => void;
    testID?: string;
}

export default function SelectedChip({
    id,
    text,
    onRemove,
    testID,
}: SelectedChipProps) {
    const action = useMemo(() => ({icon: 'remove' as const, onPress: () => onRemove(id)}), [id, onRemove]);

    return (
        <BaseChip
            testID={testID}
            action={action}
            showAnimation={true}
            label={text}
        />
    );
}
