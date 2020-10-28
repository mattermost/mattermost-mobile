// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity, StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Preferences} from '@mm-redux/constants';

interface CloseHeaderButtonProps {
    onPress: () => void;
}

const theme = Preferences.THEMES.default;

const CloseHeaderButton = ({onPress}: CloseHeaderButtonProps) => {
    return (
        <TouchableOpacity
            accessibilityComponentType='button'
            accessibilityTraits='button'
            delayPressIn={0}
            onPress={onPress}
        >
            <View style={styles.left}>
                <CompassIcon
                    name='arrow-left'
                    style={styles.closeButton}
                />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    left: {
        alignItems: 'center',
        height: 50,
        justifyContent: 'center',
        width: 50,
    },
    closeButton: {
        color: theme.sidebarHeaderTextColor,
        fontSize: 25,
    },
});

export default CloseHeaderButton;
