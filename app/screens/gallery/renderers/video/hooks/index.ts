// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {useAnimatedReaction, type SharedValue} from 'react-native-reanimated';
import {scheduleOnRN, scheduleOnUI} from 'react-native-worklets';

export function useStateFromSharedValue<T>(sharedValue: SharedValue<T> | undefined, defaultValue: T): T {
    const [state, setState] = useState(defaultValue);
    useAnimatedReaction(
        () => sharedValue?.value,
        (currentValue, previousValue) => {
            if (currentValue !== previousValue) {
                scheduleOnRN(setState, currentValue ?? defaultValue);
            }
        }, [defaultValue],
    );

    useEffect(() => {
        if (sharedValue) {
            scheduleOnUI(() => {
                'worklet';
                const currentValue = sharedValue.value;
                scheduleOnRN(setState, currentValue);
            });
        }
    }, [sharedValue]);

    return state;
}
