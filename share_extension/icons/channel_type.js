// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {Preferences} from 'mattermost-redux/constants';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

const defaultTheme = Preferences.THEMES.default;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            height: 16,
            marginRight: 5,
            width: 16
        },
        icon: {
            color: theme.centerChannelColor,
            fontSize: 16
        }
    };
});

const style = getStyleSheet(defaultTheme);

export const PublicChannel = () => { //eslint-disable-line
    return (
        <View style={style.container}>
            <Icon
                name='globe'
                style={style.icon}
            />
        </View>
    );
};

export const PrivateChannel = () => { //eslint-disable-line
    return (
        <View style={style.container}>
            <Icon
                name='lock'
                style={style.icon}
            />
        </View>
    );
};

export const DirectChannel = () => { //eslint-disable-line
    return (
        <View style={style.container}>
            <Icon
                name='user'
                style={style.icon}
            />
        </View>
    );
};

export const GroupChannel = () => { //eslint-disable-line
    return (
        <View style={style.container}>
            <Icon
                name='users'
                style={style.icon}
            />
        </View>
    );
};
