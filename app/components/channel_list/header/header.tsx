// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerDisplayName} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    displayName: string;
    iconPad?: boolean;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    headingStyles: {
        color: theme.sidebarText,
        ...typography('Heading', 700),
    },
    subHeadingStyles: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 50),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chevronButton: {
        marginLeft: 4,
    },
    chevronIcon: {
        color: changeOpacity(theme.sidebarText, 0.8),
        fontSize: 24,
    },
    plusButton: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.08),
        height: 28,
        width: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusIcon: {
        color: changeOpacity(theme.sidebarText, 0.8),
        fontSize: 18,
    },
}));

const ChannelListHeader = ({displayName, iconPad}: Props) => {
    const theme = useTheme();
    const serverDisplayName = useServerDisplayName();
    const marginLeft = useSharedValue(iconPad ? 44 : 0);
    const styles = getStyles(theme);
    const animatedStyle = useAnimatedStyle(() => ({
        marginLeft: withTiming(marginLeft.value, {duration: 350}),
    }), []);

    useEffect(() => {
        marginLeft.value = iconPad ? 44 : 0;
    }, [iconPad]);

    return (
        <Animated.View style={animatedStyle}>
            <View style={styles.headerRow}>
                <View style={styles.headerRow}>
                    <Text style={styles.headingStyles}>
                        {displayName}
                    </Text>
                    <TouchableWithFeedback style={styles.chevronButton}>
                        <CompassIcon
                            style={styles.chevronIcon}
                            name={'chevron-down'}
                        />
                    </TouchableWithFeedback>
                </View>
                <TouchableWithFeedback style={styles.plusButton}>
                    <CompassIcon
                        style={styles.plusIcon}
                        name={'plus'}
                    />
                </TouchableWithFeedback>
            </View>
            <Text style={styles.subHeadingStyles}>
                {serverDisplayName}
            </Text>
        </Animated.View>
    );
};

export default ChannelListHeader;
