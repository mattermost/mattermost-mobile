// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
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

const StatusLabel = ({status = General.OFFLINE, labelStyle}: StatusLabelProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let i18nId = t('status_dropdown.set_offline');
    let defaultMessage = 'Offline';

    switch (status) {
        case General.AWAY:
            i18nId = t('status_dropdown.set_away');
            defaultMessage = 'Away';
            break;
        case General.DND:
            i18nId = t('status_dropdown.set_dnd');
            defaultMessage = 'Do Not Disturb';
            break;
        case General.ONLINE:
            i18nId = t('status_dropdown.set_online');
            defaultMessage = 'Online';
            break;
    }

    if (status === General.OUT_OF_OFFICE) {
        i18nId = t('status_dropdown.set_ooo');
        defaultMessage = 'Out Of Office';
    }

    return (
        <FormattedText
            id={i18nId}
            defaultMessage={defaultMessage}
            style={[style.label, labelStyle]}
            testID={`user_status.label.${status}`}
        />
    );
};

export default StatusLabel;
