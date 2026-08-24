// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {CallSession} from '@calls/types/calls';
import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    speakingUser: {
        color: theme.buttonColor,
        ...typography('Body', 100, 'SemiBold'),
    },
    speakingPostfix: {
        ...typography('Body', 100, 'Regular'),
    },
}));

type Props = {
    speaker: string;
    sessionsDict: Dictionary<CallSession>;
    teammateNameDisplay: string;
    isDMCalling: boolean;
    dmCallee?: UserModel;
}

export function CallStatusText({
    speaker,
    sessionsDict,
    teammateNameDisplay,
    isDMCalling,
    dmCallee,
}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    if (isDMCalling) {
        return (
            <Text
                style={styles.speakingUser}
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
                style={styles.speakingUser}
                numberOfLines={1}
                ellipsizeMode='middle'
            >
                {displayUsername(sessionsDict[speaker]?.userModel, intl.locale, teammateNameDisplay)}
                {' '}
                <FormattedText
                    id='mobile.calls_name_is_talking_postfix'
                    defaultMessage='is talking...'
                    style={styles.speakingPostfix}
                />
            </Text>
        );
    }

    return (
        <FormattedText
            id='mobile.calls_noone_talking'
            defaultMessage='No one is talking'
            style={styles.speakingUser}
        />
    );
}
