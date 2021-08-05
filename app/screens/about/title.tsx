// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import FormattedText from '@components/formatted_text';
import React from 'react';

import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type SystemModel from '@typings/database/models/servers/system';

type TitleProps = {
    config: SystemModel;
    license: SystemModel;
}

const Title = ({config, license}: TitleProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let id = t('about.teamEditiont0');
    let defaultMessage = 'Team Edition';

    if (config.value.BuildEnterpriseReady === 'true') {
        id = t('about.teamEditiont1');
        defaultMessage = 'Enterprise Edition';

        if (license.value.IsLicensed === 'true') {
            id = t('about.enterpriseEditione1');
            defaultMessage = 'Enterprise Edition';
        }
    }
    return (
        <FormattedText
            id={id}
            defaultMessage={defaultMessage}
            style={style.title}
            testID='about.title'
        />
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        title: {
            fontSize: 22,
            color: theme.centerChannelColor,
        },
    };
});

export default Title;
