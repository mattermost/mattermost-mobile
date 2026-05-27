// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text} from 'react-native';

import {useTheme} from '@context/theme';
import {getSkuDisplayName} from '@utils/subscription';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        title: {
            ...typography('Heading', 700, 'SemiBold'),
            color: theme.centerChannelColor,
            textAlign: 'center',
            marginTop: 8,
            marginBottom: 8,
        },
    };
});

const messages = defineMessages({
    mattermost: {
        id: 'about.mattermost',
        defaultMessage: 'Mattermost',
    },
    teamEditiont0: {
        id: 'about.teamEditiont0',
        defaultMessage: 'Team Edition',
    },
    teamEditiont1: {
        id: 'about.teamEditiont1',
        defaultMessage: 'Enterprise Edition',
    },
});

type TitleProps = {
    config: ClientConfig;
    license?: ClientLicense;
};
const Title = ({config, license}: TitleProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const isEnterpriseReady = config.BuildEnterpriseReady === 'true';
    const isLicensed = license?.IsLicensed === 'true';

    let edition = intl.formatMessage(messages.teamEditiont0);
    if (isEnterpriseReady) {
        if (isLicensed) {
            edition = getSkuDisplayName(
                license?.SkuShortName ?? '',
                license?.IsGovSku === 'true',
            );
        } else {
            edition = intl.formatMessage(messages.teamEditiont1);
        }
    }

    const product = intl.formatMessage(messages.mattermost);

    return (
        <Text
            style={style.title}
            testID='about.title'
        >
            {product}
            {' '}
            {edition}
        </Text>
    );
};

export default Title;
