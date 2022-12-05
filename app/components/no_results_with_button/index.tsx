// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {popToRoot} from '@app/screens/navigation';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import Button from '@screens/bottom_sheet/button';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const messages = defineMessages({
    no_more_members_title: {
        id: t('mobile.no_more_members.title'),
        defaultMessage: 'No other members to add',
    },
    no_more_members_subtext: {
        id: t('mobile.no_more_members.subtext'),
        defaultMessage: 'All team members are already in this channel.',
    },
    go_back: {
        id: t('mobile.no_more_members.go_back'),
        defaultMessage: 'Go back',
    },
});

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center' as const,
            flexGrow: 1,
            height: '100%',
            justifyContent: 'center' as const,
        },
        buttonContainer: {
            marginTop: 24,
        },
        title: {
            color: theme.centerChannelColor,
            ...typography('Heading', 400, 'SemiBold'),
        },
        subText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            marginTop: 8,
            ...typography('Body', 200),
        },
    };
});

const NoResultsWithButton = () => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const {formatMessage} = useIntl();

    return (
        <View style={style.container}>
            <Text style={style.title}>{formatMessage(messages.no_more_members_title)}</Text>
            <Text style={style.subText}>{formatMessage(messages.no_more_members_subtext)}</Text>
            <View style={style.buttonContainer}>
                <Button
                    onPress={popToRoot}
                    icon={'arrow-left'}
                    text={formatMessage(messages.go_back)}
                />
            </View>
        </View>
    );
};

export default NoResultsWithButton;
