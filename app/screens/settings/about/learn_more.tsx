// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import Config from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
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

const messages = defineMessages({
    teamEditionLearn: {
        id: 'about.teamEditionLearn',
        defaultMessage: 'Join the Mattermost community at',
    },
    enterpriseEditionLearn: {
        id: 'about.enterpriseEditionLearn',
        defaultMessage: 'Learn more about Enterprise Edition at ',
    },
});

const LearnMore = ({config, onPress}: LearnMoreProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let message = messages.teamEditionLearn;
    const url = Config.WebsiteURL;

    if (config.BuildEnterpriseReady === 'true') {
        message = messages.enterpriseEditionLearn;
    }

    return (
        <View style={style.learnContainer}>
            <FormattedText
                {...message}
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
