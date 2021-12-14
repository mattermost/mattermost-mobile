// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {StyleProp, Text, View, ViewStyle} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type DescriptionProps = {
    text?: string;
    containerStyle?: StyleProp<ViewStyle>;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: 10,
        },
        text: {
            ...typography('Body', 75),
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

const Description = ({text, containerStyle}: DescriptionProps) => {
    const theme = useTheme();
    const intl = useIntl();

    const style = getStyleSheet(theme);

    const defaultText = intl.formatMessage({
        id: 'user.settings.general.field_handled_externally',
        defaultMessage: 'Some fields below are handled through your login provider. If you want to change them, you’ll need to do so through your login provider.',
    });

    const viewStyles = [
        style.container,
        containerStyle,
    ];

    return (
        <View
            style={viewStyles}
        >
            <Text style={style.text}>{text ?? defaultText}</Text>
        </View>
    );
};

export default Description;
