// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, type StyleProp, Text, type TextStyle, type ViewStyle} from 'react-native';

import {setSpeakerphoneOn} from '@calls/actions';
import CompassIcon from '@components/compass_icon';

import type {CurrentCall} from '@calls/types/calls';

type Props = {
    pressableStyle: StyleProp<ViewStyle>;
    iconStyle: StyleProp<ViewStyle>;
    buttonTextStyle: StyleProp<TextStyle>;
    currentCall: CurrentCall;
}

export const AudioDeviceButton = ({pressableStyle, iconStyle, buttonTextStyle, currentCall}: Props) => {
    const intl = useIntl();
    const speakerLabel = intl.formatMessage({id: 'mobile.calls_speaker', defaultMessage: 'SpeakerPhone'});

    const toggleSpeakerPhone = useCallback(() => {
        setSpeakerphoneOn(!currentCall?.speakerphoneOn);
    }, [currentCall?.speakerphoneOn]);

    return (
        <Pressable
            style={pressableStyle}
            onPress={toggleSpeakerPhone}
        >
            <CompassIcon
                name={'volume-high'}
                size={32}
                style={iconStyle}
            />
            <Text style={buttonTextStyle}>{speakerLabel}</Text>
        </Pressable>
    );
};
