// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type HelpContentProps = {
    text: string;
};

const Description = ({text}: HelpContentProps) => {
    const theme = useTheme();
    const intl = useIntl();

    const style = getStyleSheet(theme);
    const desc = text ?? intl.formatMessage({id: 'user.settings.general.field_handled_externally', defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.'});
    return (
        <View style={style.container}>
            <Text style={style.text}>{desc}</Text>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: 10,
        },
        text: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

export default Description;
