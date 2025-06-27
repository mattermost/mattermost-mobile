// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View, type LayoutChangeEvent} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import FriendlyDate from '@components/friendly_date';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        backgroundColor: theme.centerChannelColor,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        gap: 10,
    },
    text: {
        ...typography('Body', 100, 'SemiBold'),
        color: theme.centerChannelBg,
    },
    heightCalculator: {
        position: 'absolute',
        opacity: 0,
    },
}));

const VERTICAL_PADDING = 12;

type Props = {
    websocketState: string;
    lastSyncAt: number;
};

const OutOfDateHeader = ({websocketState, lastSyncAt}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const isConnected = useSharedValue(websocketState === 'connected');
    const height = useSharedValue(0);

    useEffect(() => {
        isConnected.value = websocketState === 'connected';
    }, [isConnected, websocketState]);

    const content = (
        <>
            <CompassIcon
                name='alert-outline'
                color={theme.centerChannelBg}
                size={18}
            />
            <Text style={styles.text}>
                {intl.formatMessage(
                    {
                        id: 'playbook_run.out_of_date_header.message',
                        defaultMessage: 'Unable to connect to server. Content may be out of date. Last updated {lastUpdated}.',
                    },
                    {lastUpdated: (
                        <FriendlyDate
                            value={lastSyncAt}
                            style={styles.text}
                        />
                    )},
                )}
            </Text>
        </>
    );

    const animatedStyle = useAnimatedStyle(() => ({
        height: withTiming(isConnected.value ? 0 : height.value, {duration: 200}),
        paddingVertical: withTiming(isConnected.value ? 0 : VERTICAL_PADDING, {duration: 200}),
    }));

    const calculatorStyles = useMemo(() => [
        styles.container,
        {paddingVertical: VERTICAL_PADDING},
        styles.heightCalculator,
    ], [styles.container, styles.heightCalculator]);

    const calculatorOnLayout = useCallback((event: LayoutChangeEvent) => {
        height.value = event.nativeEvent.layout.height;
    }, [height]);

    if (!lastSyncAt) {
        return null;
    }

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            {content}
            <View
                style={calculatorStyles}
                onLayout={calculatorOnLayout}
            >
                {content}
            </View>
        </Animated.View>
    );
};

export default OutOfDateHeader;

