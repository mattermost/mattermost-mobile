// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Platform, StyleSheet, View} from 'react-native';

export default class SlideUpPanelIndicator extends PureComponent {
    static propTypes = {
        containerPosition: PropTypes.object.isRequired,
        panHandlers: PropTypes.object.isRequired,
    };

    render() {
        const {panHandlers, containerPosition} = this.props;

        if (Platform.OS === 'android') {
            return null;
        }

        return (
            <Animated.View
                style={[containerPosition, styles.dragIndicatorContainer]}
                {...panHandlers}
            >
                <View style={styles.dragIndicator}/>
            </Animated.View>
        );
    }
}

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
