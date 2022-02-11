// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    title: string;
    iconName: string;
    onPress?: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        flexDirection: 'row',
        height: 72,
        marginBottom: 0,
    },
    name: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
    icon: {
        margin: 12,
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
}));

const PlusMenuItem = ({title, iconName, onPress}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container} >
            <CompassIcon
                name={iconName}
                size={20}
                color={theme.dndIndicator}
                style={styles.icon}
                onPress={onPress}
            />
            <Text
                style={styles.name}
                onPress={onPress}
            >
                {title}
            </Text>
        </View>
    );
};

export default PlusMenuItem;
