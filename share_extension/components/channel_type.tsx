// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Preferences} from '@mm-redux/constants';

const theme = Preferences.THEMES.default;

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

const style = StyleSheet.create({
    container: {
        height: 16,
        marginRight: 5,
        width: 16,
    },
    icon: {
        color: theme.centerChannelColor,
        fontSize: 16,
    },
});
