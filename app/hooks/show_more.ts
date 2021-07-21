// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useAnimatedStyle, withTiming} from 'react-native-reanimated';

export const useShowMoreAnimatedStyle = (height: number|undefined, maxHeight: number, open: boolean) => {
    return useAnimatedStyle(() => {
        if (height === undefined) {
            return {
                maxHeight,
            };
        }

        if (!open) {
            const value = height ? withTiming(maxHeight, {duration: 300}) : withTiming(maxHeight, {duration: 300});
            return {
                maxHeight: value,
            };
        }

        return {
            maxHeight: withTiming(height, {duration: 300}),
        };
    }, [open, height]);
};
