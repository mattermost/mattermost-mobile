// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Easing, type WithTimingConfig} from 'react-native-reanimated';

export const transformerTimingConfig: WithTimingConfig = {
    duration: 250,
    easing: Easing.bezier(0.33, 0.01, 0, 1),
};

export const pagerTimingConfig: WithTimingConfig = {
    duration: 250,
    easing: Easing.bezier(0.5002, 0.2902, 0.3214, 0.9962),
};
