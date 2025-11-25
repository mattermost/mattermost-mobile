// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {formatTime} from '@utils/datetime';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {TIMER_REFRESH_INTERVAL_MS} from './constants';

type Props = {
    expiryTime: number; // timestamp in ms
    onExpiry?: () => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        display: 'flex',
        flexDirection: 'row',
        gap: 6,
        backgroundColor: changeOpacity(theme.dndIndicator, 0.12),
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    text: {
        fontSize: 12,
        color: theme.dndIndicator,
        fontWeight: 600,
    },
}));

const ExpiryCountdown: React.FC<Props> = ({expiryTime, onExpiry}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const [remainingSeconds, setRemainingSeconds] = useState(() => Math.max(0, expiryTime - Date.now()) / 1000);

    useEffect(() => {
        const timer = setInterval(() => {
            const remainingTime = Math.max(0, expiryTime - Date.now()) / 1000;
            setRemainingSeconds(remainingTime);

            if (remainingTime <= 0) {
                clearInterval(timer);
                onExpiry?.();
            }
        }, TIMER_REFRESH_INTERVAL_MS);

        return () => clearInterval(timer);
    }, [expiryTime, onExpiry]);

    return (
        <View style={style.container}>
            <CompassIcon
                name='fire'
                size={16}
                color={theme.dndIndicator}
            />
            <Text style={style.text}>
                {formatTime(remainingSeconds)}
            </Text>
        </View>
    );
};

export default ExpiryCountdown;

