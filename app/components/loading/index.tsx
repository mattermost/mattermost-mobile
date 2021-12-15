// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import LottieView from 'lottie-react-native';
import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';

type LoadingProps = {
    containerStyle?: ViewStyle;
    style?: ViewStyle;
    color?: string;
}

const Loading = ({containerStyle, style, color}: LoadingProps) => {
    return (
        <View style={containerStyle}>
            <LottieView
                source={require('./spinner.json')}
                autoPlay={true}
                loop={true}
                style={[styles.lottie, style]}
                colorFilters={color ? [{color, keypath: 'Shape Layer 1'}] : undefined}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    lottie: {
        height: 32,
        width: 32,
    },
});

export default Loading;
