// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, ViewProps, ViewStyle} from 'react-native';
import {AnimatedStyleProp} from 'react-native-reanimated';

import Toast from '@components/toast';

type SnackBarProps = {
    iconName: string;
    componentId: string;
    isDismissible: boolean;
    message: string;
    style: StyleProp<ViewProps>;
    barType: string; // connection lost, reconnected, etc..
    animatedStyle: AnimatedStyleProp<ViewStyle>;
}

//todo: add method to dismiss the overlay  => Navigation.dismissOverlay(componentId)

//todo: think of how to prevent the overlay from being dismissed => e.g. prevent it from being dismissed if no connection,
// but if you get connection, then remove the toast....add connection listener?

const SnackBar = ({
    animatedStyle,
    iconName,
    message,
    style,
    barType,
    isDismissible,
}: SnackBarProps) => {
    console.log('>>>  in snack bar screen');
    return (
        <Toast
            animatedStyle={animatedStyle}
            style={style}
            message={message}
            iconName={iconName}
        />
    );
};

export default SnackBar;
