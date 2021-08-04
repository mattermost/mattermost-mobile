// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import Config from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type SystemModel from '@typings/database/models/servers/system';

type LearnMoreProps = {
    config: SystemModel;
    onHandleAboutEnterprise: () => void;
    onHandleAboutTeam: () => void;
};

const LearnMore = ({config, onHandleAboutEnterprise, onHandleAboutTeam}: LearnMoreProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let id = t('about.teamEditionLearn');
    let defaultMessage = 'Join the Mattermost community at ';
    let onPress = onHandleAboutTeam;
    let url = Config.TeamEditionLearnURL;

    if (config.value?.BuildEnterpriseReady === 'true') {
        id = t('about.enterpriseEditionLearn');
        defaultMessage = 'Learn more about Enterprise Edition at ';
        onPress = onHandleAboutEnterprise;
        url = Config.EELearnURL;
    }

    return (
        <View style={style.learnContainer}>
            <FormattedText
                id={id}
                defaultMessage={defaultMessage}
                style={style.learn}
                testID='about.learn_more'
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

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        learnContainer: {
            flex: 1,
            flexDirection: 'column',
            marginVertical: 20,
        },
        learn: {
            color: theme.centerChannelColor,
            fontSize: 16,
        },
        learnLink: {
            color: theme.linkColor,
            fontSize: 16,
        },
    };
});

export default LearnMore;
