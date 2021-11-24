// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

const styles = StyleSheet.create({
    icon: {
        flex: 0,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        zIndex: 10,
        top: 10,
        left: 16,
        width: 40,
        height: 40,
    },
});

export default function ServerIcon() {
    const theme = useTheme();

    return (
        <View style={styles.icon}>
            <CompassIcon
                size={24}
                name='server-variant'
                color={changeOpacity(theme.buttonColor, 0.56)}
            />
        </View>
    );
}

