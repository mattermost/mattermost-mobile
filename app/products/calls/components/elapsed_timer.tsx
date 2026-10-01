// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useEffect, useState} from 'react';
import {Text, type StyleProp, type TextStyle} from 'react-native';

import {toMilliseconds} from '@utils/datetime';

type Props = {
    style: StyleProp<TextStyle>;
    value: number;
    truncateWhenLong?: boolean;
    updateIntervalInSeconds?: number;
}

export const ElapsedTimer = ({value, style, truncateWhenLong, updateIntervalInSeconds}: Props) => {
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

        if (hours > 0 && truncateWhenLong) {
            return `${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
        }
        if (hours > 0) {
            return `${hours}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        }
        return `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    };

    const [formattedTime, setFormattedTime] = useState(() => getCallDuration());
    useEffect(() => {
        // The interval closes over the value it was created with, so it has to be recreated whenever the
        // value changes (e.g. a call being answered moves its start time forward).
        setFormattedTime(getCallDuration());

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

    // We don't care about `getCallDuration` changes as long as
    // it is up to date when the effect runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateIntervalInSeconds, value]);

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
