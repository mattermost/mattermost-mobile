// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import Config from '@assets/config.json';
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

const LearnMore = ({config, license, onPress}: LearnMoreProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const url = Config.WebsiteURL;

    const isEnterpriseReady = config.BuildEnterpriseReady === 'true';
    const isLicensed = license?.IsLicensed === 'true';

    let learnText: string;
    if (!isEnterpriseReady) {
        learnText = intl.formatMessage({id: 'about.teamEditionLearn', defaultMessage: 'Join the Mattermost community at '});
    } else if (isLicensed) {
        const planName = getSkuDisplayName(
            license?.SkuShortName ?? '',
            license?.IsGovSku === 'true',
        );
        learnText = intl.formatMessage({id: 'about.planNameLearn', defaultMessage: 'Learn more about Mattermost {planName} at '}, {planName});
    } else {
        learnText = intl.formatMessage({id: 'about.enterpriseEditionLearn', defaultMessage: 'Learn more about Enterprise Edition at '});
    }

    return (
        <View style={style.learnContainer}>
            {/* Use View instead of Text wrapper so Fabric doesn't flatten
                inner Text elements and drop their testIDs on iOS 26
                (MM-T5104_1). */}
            <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                <Text
                    style={style.learn}
                    testID='about.learn_more.text'
                >
                    {learnText}
                </Text>
                <Text
                    accessibilityRole='link'
                    style={style.learnLink}
                    onPress={onPress}
                    testID='about.learn_more.url'
                >
                    {url}
                </Text>
            </View>
        </View>
    );
};

export default LearnMore;
