// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated, StyleSheet, View} from 'react-native';

const styles = StyleSheet.create({
    dragIndicatorContainer: {
        marginVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dragIndicator: {
        backgroundColor: 'white',
        height: 5,
        width: 62.5,
        opacity: 0.9,
        borderRadius: 25,
    },
});

const Indicator = () => {
    return (
        <Animated.View
            style={styles.dragIndicatorContainer}
        >
            <View style={styles.dragIndicator}/>
        </Animated.View>
    );
};

export default Indicator;
