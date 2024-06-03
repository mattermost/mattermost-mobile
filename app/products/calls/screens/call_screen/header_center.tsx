// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {getHandsRaisedNames, makeCallsTheme} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {CallSession, CallsTheme} from '@calls/types/calls';

export type Props = {
    raisedHands: CallSession[];
    sessionId: string;
    teammateNameDisplay: string;
    displayName?: string;
    isOwnDirectMessage: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => ({
    raisedHandBannerContainer: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'center',
    },
    raisedHandBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 4,
        paddingRight: 18,
        paddingBottom: 4,
        paddingLeft: 6,
        marginRight: 6,
        marginLeft: 4,
        gap: 4,
        borderRadius: 18,
        backgroundColor: theme.sidebarText,
    },
    raisedHandIcon: {
        color: theme.awayIndicator,
    },
    raisedHandName: {
        ...typography('Body', 100, 'SemiBold'),
        color: theme.sidebarTeamBarBg,
    },
    raisedHandText: {
        ...typography(),
        color: theme.sidebarTeamBarBg,
    },
    titleBanner: {
        ...typography('Body', 200, 'SemiBold'),
        color: changeOpacity(theme.buttonColor, 0.72),
    },
}));

export const HeaderCenter = ({raisedHands, sessionId, teammateNameDisplay, displayName, isOwnDirectMessage}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const callsTheme = useMemo(() => makeCallsTheme(theme), [theme]);
    const style = getStyleSheet(callsTheme);
    let channelTitle = displayName;
    if (isOwnDirectMessage) {
        channelTitle = intl.formatMessage({
            id: 'channel_header.directchannel.you',
            defaultMessage: '{displayName} (you)',
        }, {displayName});
    }

    if (raisedHands.length === 0) {
        return (
            <View style={style.raisedHandBannerContainer}>
                <Text
                    style={style.titleBanner}
                    numberOfLines={1}
                >
                    {channelTitle}
                </Text>
            </View>
        );
    }

    const names = getHandsRaisedNames(raisedHands, sessionId, intl.locale, teammateNameDisplay, intl);

    return (
        <View style={style.raisedHandBannerContainer}>
            <View style={style.raisedHandBanner}>
                <CompassIcon
                    name={'hand-right'}
                    size={16}
                    style={style.raisedHandIcon}
                />
                <FormattedText
                    style={style.raisedHandText}
                    id='mobile.calls_raised_hand'
                    defaultMessage='<bold>{name} {num, plural, =0 {} other {+# more }}</bold>raised a hand'
                    values={{
                        name: names[0],
                        num: names.length - 1,
                        bold: (str: string) => <Text style={style.raisedHandName}>{str}</Text>,
                    }}
                    numberOfLines={1}
                />
            </View>
        </View>
    );
};
