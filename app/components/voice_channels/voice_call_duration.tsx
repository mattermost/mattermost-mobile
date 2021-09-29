// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useEffect, useState} from 'react';
import {Text, TextProps} from 'react-native';

type VoiceCallDurationProps = TextProps & {
    value: number;
    updateIntervalInSeconds: number;
}

const VoiceCallDuration = ({value, ...props}: VoiceCallDurationProps) => {
    const getVoiceCallDuration = () => {
        const now = moment();
        const startTime = moment(value);
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

    const [formattedTime, setFormattedTime] = useState(getVoiceCallDuration());
    useEffect(() => {
        const interval = setInterval(() => setFormattedTime(getVoiceCallDuration()), props.updateIntervalInSeconds);
        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <Text {...props}>
            {formattedTime}
        </Text>
    );
};

export default VoiceCallDuration;
