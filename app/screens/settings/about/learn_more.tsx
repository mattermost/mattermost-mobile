// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import Config from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        learnContainer: {
            flex: 1,
            flexDirection: 'column',
            marginVertical: 20,
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
    onPress: () => void;
};

const LearnMore = ({config, onPress}: LearnMoreProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let id = t('about.teamEditionLearn');
    let defaultMessage = 'Join the Mattermost community at ';
    const url = Config.WebsiteURL;

    if (config.BuildEnterpriseReady === 'true') {
        id = t('about.enterpriseEditionLearn');
        defaultMessage = 'Learn more about Enterprise Edition at ';
    }

    return (
        <View style={style.learnContainer}>
            <FormattedText
                id={id}
                defaultMessage={defaultMessage}
                style={style.learn}
                testID='about.learn_more.text'
            />
            <TouchableOpacity onPress={onPress}>
                <Text
                    style={style.learnLink}
                    testID='about.learn_more.url'
                >
                    {url}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default LearnMore;
