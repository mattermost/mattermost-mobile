// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated, StyleProp, Text, View, ViewStyle} from 'react-native';
import {RectButton} from 'react-native-gesture-handler';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    color: string;
    icon: string;
    onPress: () => void;
    progress: Animated.AnimatedInterpolation;
    style?: StyleProp<ViewStyle>;
    text: string;
    x: number;
}

export const OPTION_SIZE = 72;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        height: OPTION_SIZE,
        width: OPTION_SIZE,
    },
    text: {
        color: theme.sidebarText,
        ...typography('Body', 75, 'SemiBold'),
    },
}));

const ServerOption = ({color, icon, onPress, progress, style, text, x}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const trans = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [x, 0],
    });

    return (
        <Animated.View style={{transform: [{translateX: trans}]}}>
            <View style={[styles.container, {backgroundColor: color}, style]}>
                <RectButton
                    style={[styles.container, styles.centered]}
                    onPress={onPress}
                >
                    <CompassIcon
                        color={theme.sidebarText}
                        name={icon}
                        size={24}
                    />
                    <Text style={styles.text}>{text}</Text>
                </RectButton>
            </View>
        </Animated.View>
    );
};

export default ServerOption;
