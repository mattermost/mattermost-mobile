// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';
import {Text, View} from 'react-native';

import Config from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {getSkuDisplayName} from '@utils/subscription';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        learnContainer: {
            flex: 1,
            flexDirection: 'column',
            marginTop: 20,
        },
        learn: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        learnLink: {
            color: theme.linkColor,
            ...typography('Body', 200, 'Regular'),
        },
    };
});

type LearnMoreProps = {
    config: ClientConfig;
    license?: ClientLicense;
    onPress: () => void;
};

const messages = defineMessages({
    teamEditionLearn: {
        id: 'about.teamEditionLearn',
        defaultMessage: 'Join the Mattermost community at ',
    },
    enterpriseEditionLearn: {
        id: 'about.enterpriseEditionLearn',
        defaultMessage: 'Learn more about Enterprise Edition at ',
    },
    planNameLearn: {
        id: 'about.planNameLearn',
        defaultMessage: 'Learn more about Mattermost {planName} at ',
    },
});

const LearnMore = ({config, license, onPress}: LearnMoreProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const url = Config.WebsiteURL;

    const isEnterpriseReady = config.BuildEnterpriseReady === 'true';
    const isLicensed = license?.IsLicensed === 'true';

    const learnIntro = (() => {
        if (!isEnterpriseReady) {
            return (
                <FormattedText
                    {...messages.teamEditionLearn}
                    testID='about.learn_more.text'
                />
            );
        }
        if (isLicensed) {
            const planName = getSkuDisplayName(
                license?.SkuShortName ?? '',
                license?.IsGovSku === 'true',
            );
            return (
                <FormattedText
                    {...messages.planNameLearn}
                    testID='about.learn_more.text'
                    values={{planName}}
                />
            );
        }
        return (
            <FormattedText
                {...messages.enterpriseEditionLearn}
                testID='about.learn_more.text'
            />
        );
    })();

    return (
        <View style={style.learnContainer}>
            <Text style={style.learn}>
                {learnIntro}
                <Text
                    accessibilityRole='link'
                    style={style.learnLink}
                    onPress={onPress}
                    testID='about.learn_more.url'
                >
                    {url}
                </Text>
            </Text>
        </View>
    );
};

export default LearnMore;
