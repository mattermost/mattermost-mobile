// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    text: string | number;
}

const getStyleSheet = ({theme}: { theme: Theme }) => {
    return StyleSheet.create({
        container: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.48),
            borderRadius: 10,
            paddingLeft: 5,
            paddingRight: 5,
        },
        text: {
            paddingTop: 1.5,
            paddingBottom: 1.5,
            paddingLeft: 2.5,
            paddingRight: 2.5,
            ...typography('Body', 50, 'SemiBold'),
            color: theme.centerChannelBg,
        },
    });
};

const Pill = ({text}: Props) => {
    const theme = useTheme();
    const styles = useMemo(() => getStyleSheet({theme}), [theme]);

    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                {text}
            </Text>
        </View>
    );
};

export default Pill;
