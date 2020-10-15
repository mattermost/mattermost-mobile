// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    View,
} from 'react-native';

import {Preferences} from '@mm-redux/constants';

import CompassIcon from '@components/compass_icon';
import {makeStyleSheetFromTheme} from '@utils/theme';

const defaultTheme = Preferences.THEMES.default;

export function PublicChannel() {
    return (
        <View style={style.container}>
            <CompassIcon
                name='globe'
                style={style.icon}
            />
        </View>
    );
}

export function PrivateChannel() {
    return (
        <View style={style.container}>
            <CompassIcon
                name='lock'
                style={style.icon}
            />
        </View>
    );
}

export function DirectChannel() {
    return (
        <View style={style.container}>
            <CompassIcon
                name='account-outline'
                style={style.icon}
            />
        </View>
    );
}

export function GroupChannel() {
    return (
        <View style={style.container}>
            <CompassIcon
                name='account-group-outline'
                style={style.icon}
            />
        </View>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            height: 16,
            marginRight: 5,
            width: 16,
        },
        icon: {
            color: theme.centerChannelColor,
            fontSize: 16,
        },
    };
});

const style = getStyleSheet(defaultTheme);
