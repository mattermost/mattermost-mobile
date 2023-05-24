// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity} from 'react-native';
import Animated, {type SharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    onPress: () => void;
    topPosition: SharedValue<number>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        position: 'absolute',
        right: 20,
        zIndex: 1,
    },
    row: {flexDirection: 'row'},
    text: {
        color: theme.linkColor,
        marginLeft: 7,
        ...typography('Heading', 100),
    },
}));

const ResetToDefault = ({onPress, topPosition}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const animatedStyle = useAnimatedStyle(() => ({
        top: withTiming(topPosition.value, {duration: 100}),
    }));

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <TouchableOpacity
                onPress={onPress}
                style={styles.row}
            >
                <CompassIcon
                    name='refresh'
                    size={18}
                    color={theme.linkColor}
                />
                <FormattedText
                    id='channel_notification_preferences.reset_default'
                    defaultMessage='Reset to default'
                    style={styles.text}
                />
            </TouchableOpacity>
        </Animated.View>
    );
};

export default ResetToDefault;
