// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useEffect, useState} from 'react';
import {Text, type StyleProp, type TextStyle} from 'react-native';

import {toMilliseconds} from '@utils/datetime';

type CallDurationProps = {
    style: StyleProp<TextStyle>;
    value: number;
    updateIntervalInSeconds?: number;
}

const CallDuration = ({value, style, updateIntervalInSeconds}: CallDurationProps) => {
    const getCallDuration = () => {
        const now = moment();
        const startTime = moment(value);
        if (now < startTime) {
            return '00:00';
        }

        const totalSeconds = now.diff(startTime, 'seconds');
        const seconds = totalSeconds % 60;
        const totalMinutes = Math.floor(totalSeconds / 60);
        const minutes = totalMinutes % 60;
        const hours = Math.floor(totalMinutes / 60);

        if (hours > 0) {
            return `${hours}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        }
        return `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    };

    const [formattedTime, setFormattedTime] = useState(() => getCallDuration());
    useEffect(() => {
        if (updateIntervalInSeconds) {
            const interval = setInterval(
                () => setFormattedTime(getCallDuration()),
                toMilliseconds({seconds: updateIntervalInSeconds}),
            );
            return function cleanup() {
                clearInterval(interval);
            };
        }
        return function cleanup() {
            return null;
        };
    }, [updateIntervalInSeconds]);

    return (
        <Text
            style={style}
            numberOfLines={1}
            ellipsizeMode={'clip'}
        >
            {formattedTime}
        </Text>
    );
};

export default CallDuration;
