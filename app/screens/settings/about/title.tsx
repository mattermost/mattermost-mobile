// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        title: {
            ...typography('Heading', 800, 'SemiBold'),
            color: theme.centerChannelColor,
            paddingHorizontal: 36,
        },
        spacerTop: {
            marginTop: 8,
        },
        spacerBottom: {
            marginBottom: 8,
        },
    };
});

type TitleProps = {
    config: ClientConfig;
    license?: ClientLicense;
}
const Title = ({config, license}: TitleProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let id = t('about.teamEditiont0');
    let defaultMessage = 'Team Edition';

    if (config.BuildEnterpriseReady === 'true') {
        id = t('about.teamEditiont1');
        defaultMessage = 'Enterprise Edition';

        if (license?.IsLicensed === 'true') {
            id = t('about.enterpriseEditione1');
            defaultMessage = 'Enterprise Edition';
        }
    }

    return (
        <>
            <Text
                style={[style.title, style.spacerTop]}
                testID='about.site_name'
            >
                {`${config.SiteName} `}
            </Text>
            <FormattedText
                id={id}
                defaultMessage={defaultMessage}
                style={[style.title, style.spacerBottom]}
                testID='about.title'
            />
        </>

    );
};

export default Title;
