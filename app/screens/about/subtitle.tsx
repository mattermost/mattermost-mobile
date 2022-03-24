// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type SubtitleProps = {
    config: ClientConfig;
}

const Subtitle = ({config}: SubtitleProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let id = t('about.teamEditionSt');
    let defaultMessage = 'All your team communication in one place, instantly searchable and accessible anywhere.';

    if (config.BuildEnterpriseReady === 'true') {
        id = t('about.enterpriseEditionSt');
        defaultMessage = 'Modern communication from behind your firewall.';
    }

    return (
        <FormattedText
            id={id}
            defaultMessage={defaultMessage}
            style={style.subtitle}
            testID='about.subtitle'
        />
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        subtitle: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 19,
            marginBottom: 15,
        },
    };
});

export default Subtitle;
