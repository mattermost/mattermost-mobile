// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type HelpContentProps = {
    text: string | number;
};

const InputFieldDescription = ({text}: HelpContentProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            <Text style={style.text}>{text}</Text>
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

export default InputFieldDescription;
