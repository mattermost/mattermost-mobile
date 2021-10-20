// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useEffect, useState} from 'react';
import {Text, TextProps, StyleProp, TextStyle} from 'react-native';

type CallDurationProps = TextProps & {
    style: StyleProp<TextStyle>;
    value: number;
    updateIntervalInSeconds: number;
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

    const [formattedTime, setFormattedTime] = useState(getCallDuration());
    useEffect(() => {
        const interval = setInterval(() => setFormattedTime(getCallDuration()), updateIntervalInSeconds * 1000);
        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <Text style={style}>
            {formattedTime}
        </Text>
    );
};

export default CallDuration;
