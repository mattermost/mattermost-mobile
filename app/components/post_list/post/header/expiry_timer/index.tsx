// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
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

function formatTime(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const ExpiryCountdown: React.FC<Props> = ({expiryTime, onExpiry}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const [remaining, setRemaining] = useState(() => Math.max(0, expiryTime - Date.now()));

    useEffect(() => {
        const timer = setInterval(() => {
            const remainingTime = Math.max(0, expiryTime - Date.now());
            setRemaining(remainingTime);

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
                {formatTime(remaining)}
            </Text>
        </View>
    );
};

export default ExpiryCountdown;

