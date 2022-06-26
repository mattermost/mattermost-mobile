// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity, StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

type Props = {
    onPress: () => void;
}

const styles = StyleSheet.create({
    threeDotContainer: {
        alignItems: 'flex-end',
        marginHorizontal: 20,
    },
});

const hitSlop = {top: 5, bottom: 5, left: 5, right: 5};

export default function FileOptionsIcon({onPress}: Props) {
    const theme = useTheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.threeDotContainer}
            hitSlop={hitSlop}
        >
            <CompassIcon
                name='dots-horizontal'
                color={changeOpacity(theme.centerChannelColor, 0.56)}
                size={18}
            />
        </TouchableOpacity>
    );
}
