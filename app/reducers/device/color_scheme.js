// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Appearance} from 'react-native-appearance';

import {DeviceTypes} from 'app/constants';

const initialState = {
    colorScheme: Appearance.getColorScheme(),
};

export default function colorScheme(state = initialState, action) {
    switch (action.type) {
    case DeviceTypes.COLOR_SCHEME_CHANGED:
        return action.colorScheme;
    default:
        return state;
    }
}
