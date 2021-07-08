// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ActivityIndicator, StyleSheet, View, ViewStyle} from 'react-native';

type LoadingProps = {
    color?: string;
    size?: 'small' | 'large';
    style?: ViewStyle;
}

const Loading = ({size = 'large', color = 'grey', style}: LoadingProps) => {
    return (
        <View style={styles.container}>
            <ActivityIndicator
                style={[styles.loading, style]}
                animating={true}
                size={size}
                color={color}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loading: {
        marginLeft: 3,
    },
});

export default Loading;
