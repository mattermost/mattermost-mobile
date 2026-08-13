// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, type StyleProp, type TextStyle} from 'react-native';

import {displayUsername} from '@utils/user';

import type {CallSession} from '@calls/types/calls';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    speaker: string;
    sessionsDict: Dictionary<CallSession>;
    teammateNameDisplay: string;
    isDMCalling: boolean;
    dmCallee?: UserModel;
    speakingUserStyle: StyleProp<TextStyle>;
    speakingPostfixStyle: StyleProp<TextStyle>;
}

export function CallStatusText({
    speaker,
    sessionsDict,
    teammateNameDisplay,
    isDMCalling,
    dmCallee,
    speakingUserStyle,
    speakingPostfixStyle,
}: Props) {
    const intl = useIntl();

    if (isDMCalling) {
        return (
            <Text
                style={speakingUserStyle}
                numberOfLines={1}
                ellipsizeMode='tail'
            >
                {displayUsername(dmCallee, intl.locale, teammateNameDisplay)}
            </Text>
        );
    }

    if (speaker) {
        return (
            <Text
                style={speakingUserStyle}
                numberOfLines={1}
                ellipsizeMode='middle'
            >
                {displayUsername(sessionsDict[speaker]?.userModel, intl.locale, teammateNameDisplay)}
                {' '}
                <Text style={speakingPostfixStyle}>{
                    intl.formatMessage({
                        id: 'mobile.calls_name_is_talking_postfix',
                        defaultMessage: 'is talking...',
                    })}
                </Text>
            </Text>
        );
    }

    return (
        <Text style={speakingUserStyle}>
            {intl.formatMessage({
                id: 'mobile.calls_noone_talking',
                defaultMessage: 'No one is talking',
            })}
        </Text>
    );
}
