// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {runOnJS, runOnUI, useAnimatedReaction, type SharedValue} from 'react-native-reanimated';

export function useStateFromSharedValue<T>(sharedValue: SharedValue<T> | undefined, defaultValue: T): T {
    const [state, setState] = useState(defaultValue);
    useAnimatedReaction(
        () => sharedValue?.value,
        (currentValue, previousValue) => {
            if (currentValue !== previousValue) {
                runOnJS(setState)(currentValue ?? defaultValue);
            }
        }, [defaultValue],
    );

    useEffect(() => {
        if (sharedValue) {
            runOnUI(() => {
                'worklet';
                const currentValue = sharedValue.value;
                runOnJS(setState)(currentValue);
            })();
        }
    }, [sharedValue]);

    return state;
}
