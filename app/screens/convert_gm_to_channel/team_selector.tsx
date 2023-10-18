// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        teamSelector: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
            display: 'flex',
            flexDirection: 'row',
            height: 48,
            alignItems: 'center',
            gap: 8,
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 100),
        },
        value: {},
        placeholder: {
            marginLeft: 'auto',
            marginRight: 0,
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 100),
        },
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.52),
            marginRight: 0,
            width: 20,
        },
    };
});

export const TeamSelector = () => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const intl = useIntl();
    const label = intl.formatMessage({id: 'channel_into.convert_gm_to_channel.team_selector.label', defaultMessage: 'Team'});

    const placeholderText = intl.formatMessage({id: 'channel_into.convert_gm_to_channel.team_selector.placeholder', defaultMessage: 'Select a Team'});
    const placeholder = (
        <Text style={styles.placeholder}>{placeholderText}</Text>
    );

    return (
        <View style={styles.teamSelector}>
            <Text style={styles.label}>
                {label}
            </Text>

            {placeholder}

            <CompassIcon
                style={styles.icon}
                name='arrow-forward-ios'
                size={18}
            />
        </View>
    );
};
