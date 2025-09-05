// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

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
    const onPress = useCallback(() => {
        onRemove(id);
    }, [onRemove, id]);

    return (
        <BaseChip
            testID={testID}
            onPress={onPress}
            actionIcon='remove'
            showAnimation={true}
            label={text}
        />
    );
}
