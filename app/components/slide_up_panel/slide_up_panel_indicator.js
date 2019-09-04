// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated, Platform, StyleSheet, View} from 'react-native';
import PropTypes from 'prop-types';

export default function slideUpPanelIndicator({dragIndicatorColor}) {
    if (Platform.OS === 'android') {
        return null;
    }

    const dragIndicatorStyle = dragIndicatorColor ? {backgroundColor: dragIndicatorColor} : null;

    return (
        <Animated.View
            style={styles.dragIndicatorContainer}
        >
            <View style={[styles.dragIndicator, dragIndicatorStyle]}/>
        </Animated.View>
    );
}

slideUpPanelIndicator.propTypes = {
    dragIndicatorColor: PropTypes.string,
};

const styles = StyleSheet.create({
    dragIndicatorContainer: {
        marginVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dragIndicator: {
        height: 5,
        width: 62.5,
        opacity: 0.9,
        borderRadius: 25,
    },
});
