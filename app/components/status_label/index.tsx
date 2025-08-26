// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';

import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {StyleProp, TextStyle} from 'react-native';

type StatusLabelProps = {
    status?: string;
    labelStyle?: StyleProp<TextStyle>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        label: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 200),
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
    };
});

const messages = defineMessages({
    setAway: {
        id: 'status_dropdown.set_away',
        defaultMessage: 'Away',
    },
    setDnd: {
        id: 'status_dropdown.set_dnd',
        defaultMessage: 'Do Not Disturb',
    },
    setOnline: {
        id: 'status_dropdown.set_online',
        defaultMessage: 'Online',
    },
    setOffline: {
        id: 'status_dropdown.set_offline',
        defaultMessage: 'Offline',
    },
    setOoo: {
        id: 'status_dropdown.set_ooo',
        defaultMessage: 'Out Of Office',
    },
});
const StatusLabel = ({status = General.OFFLINE, labelStyle}: StatusLabelProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let message = messages.setOffline;

    switch (status) {
        case General.AWAY:
            message = messages.setAway;
            break;
        case General.DND:
            message = messages.setDnd;
            break;
        case General.ONLINE:
            message = messages.setOnline;
            break;
    }

    if (status === General.OUT_OF_OFFICE) {
        message = messages.setOoo;
    }

    return (
        <FormattedText
            {...message}
            style={[style.label, labelStyle]}
            testID={`user_status.label.${status}`}
        />
    );
};

export default StatusLabel;
