// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';
import Button from 'react-native-button';

import {View as ViewConstants} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CloudSvg from './cloud_svg';

type FailedActionProps = {
    action?: string;
    message: string;
    title: string;
    onAction: () => void;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingVertical: ViewConstants.INDICATOR_BAR_HEIGHT,
            paddingBottom: 15,
        },
        title: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 20,
            fontWeight: '600',
            marginBottom: 15,
            marginTop: 10,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 17,
            lineHeight: 25,
            textAlign: 'center',
        },
        link: {
            color: theme.buttonColor,
            fontSize: 15,
        },
        buttonContainer: {
            backgroundColor: theme.buttonBg,
            borderRadius: 5,
            height: 42,
            justifyContent: 'center',
            marginTop: 20,
            paddingHorizontal: 12,
        },
    };
});

const FailedAction = ({action, message, title, onAction}: FailedActionProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const text = action || intl.formatMessage({id: 'failed_action.try_again', defaultMessage: 'Try again'});

    return (
        <View style={style.container}>
            <CloudSvg
                color={changeOpacity(theme.centerChannelColor, 0.15)}
                height={76}
                width={76}
            />
            <Text
                style={style.title}
                testID='error_title'
            >
                {title}
            </Text>
            <Text
                style={style.description}
                testID='error_text'
            >
                {message}
            </Text>
            <Button
                containerStyle={style.buttonContainer}
                onPress={onAction}
            >
                <Text style={style.link}>{text}</Text>
            </Button>
        </View>
    );
};

export default FailedAction;
