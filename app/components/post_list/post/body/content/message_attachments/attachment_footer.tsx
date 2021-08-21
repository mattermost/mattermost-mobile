// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View, Platform} from 'react-native';
import FastImage from 'react-native-fast-image';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    icon?: string;
    text: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 5,
        },
        icon: {
            height: 12,
            width: 12,
            marginRight: 5,
            marginTop: Platform.select({android: 2, ios: 1}),
        },
        text: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
        },
    };
});

const AttachmentFooter = ({icon, text, theme}: Props) => {
    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            {Boolean(icon) &&
                <FastImage
                    source={{uri: icon}}
                    key='footer_icon'
                    style={style.icon}
                />
            }
            <Text
                key='footer_text'
                style={style.text}
                ellipsizeMode='tail'
                numberOfLines={1}
            >
                {text}
            </Text>
        </View>
    );
};

export default AttachmentFooter;
