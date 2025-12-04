// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        subtitle: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Heading', 400, 'Regular'),
            textAlign: 'center',
            paddingHorizontal: 36,
        },
    };
});

const messages = defineMessages({
    teamEditionSt: {
        id: 'about.teamEditionSt',
        defaultMessage: 'All your team communication in one place, instantly searchable and accessible anywhere.',
    },
    enterpriseEditionSt: {
        id: 'about.enterpriseEditionSt',
        defaultMessage: 'Modern communication from behind your firewall.',
    },
});

type SubtitleProps = {
    config: ClientConfig;
}
const Subtitle = ({config}: SubtitleProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let message = messages.teamEditionSt;

    if (config.BuildEnterpriseReady === 'true') {
        message = messages.enterpriseEditionSt;
    }

    return (
        <FormattedText
            {...message}
            style={style.subtitle}
            testID='about.subtitle'
        />
    );
};

export default Subtitle;
