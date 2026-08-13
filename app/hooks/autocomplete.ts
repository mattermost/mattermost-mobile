// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';
import {useSharedValue} from 'react-native-reanimated';

export const useAutocompleteDefaultAnimatedValues = (position: number, availableSpace: number) => {
    const animatedPosition = useSharedValue(position);
    const animatedAvailableSpace = useSharedValue(availableSpace);

    useEffect(() => {
        animatedPosition.value = position;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [position]);

    useEffect(() => {
        animatedAvailableSpace.value = availableSpace;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableSpace]);

    return [animatedPosition, animatedAvailableSpace];
};
