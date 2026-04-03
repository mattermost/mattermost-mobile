// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';
import {Text} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {getSkuDisplayName} from '@utils/subscription';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        title: {
            ...typography('Heading', 800, 'SemiBold'),
            color: theme.centerChannelColor,
            paddingHorizontal: 36,
            textAlign: 'center' as const,
        },
        spacerTop: {
            marginTop: 8,
        },
        spacerBottom: {
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
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const isEnterpriseReady = config.BuildEnterpriseReady === 'true';
    const isLicensed = license?.IsLicensed === 'true';

    const editionLine = (() => {
        if (!isEnterpriseReady) {
            return (
                <FormattedText
                    {...messages.teamEditiont0}
                    style={[style.title, style.spacerBottom]}
                    testID='about.title'
                />
            );
        }
        if (!isLicensed) {
            return (
                <FormattedText
                    {...messages.teamEditiont1}
                    style={[style.title, style.spacerBottom]}
                    testID='about.title'
                />
            );
        }
        const skuName = getSkuDisplayName(
            license?.SkuShortName ?? '',
            license?.IsGovSku === 'true',
        );
        return (
            <Text
                style={[style.title, style.spacerBottom]}
                testID='about.title'
            >
                {skuName}
            </Text>
        );
    })();

    return (
        <>
            <FormattedText
                {...messages.mattermost}
                style={[style.title, style.spacerTop]}
                testID='about.product_name'
            />
            {editionLine}
        </>
    );
};

export default Title;
