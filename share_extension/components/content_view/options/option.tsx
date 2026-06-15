// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    label: string;
    onPress: () => void;
    theme: Theme;
    value: string;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        height: 48,
        alignItems: 'center',
    },
    label: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    row: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-end',

    },
    value: {
        alignItems: 'flex-end',
        color: changeOpacity(theme.centerChannelColor, 0.56),
        top: 2,
        flexShrink: 1,
        marginLeft: 10,
        ...typography('Body', 100),
    },
}));

const Option = ({label, onPress, theme, value}: Props) => {
    const styles = getStyles(theme);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.container}
        >
            <Text style={styles.label}>{label}</Text>
            <View style={styles.row}>
                <Text
                    numberOfLines={1}
                    style={styles.value}
                >
                    {value}
                </Text>
                <CompassIcon
                    color={changeOpacity(theme.centerChannelColor, 0.32)}
                    name='chevron-right'
                    size={24}
                />
            </View>
        </TouchableOpacity>
    );
};

export default Option;
