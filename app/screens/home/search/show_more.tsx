// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type ShowMoreButtonProps = {
    onPress: () => void;
    showMore: boolean;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        showMore: {
            paddingLeft: 20,
            paddingTop: 12,
            color: theme.buttonBg,
            ...typography('Body', 400, 'SemiBold'),
        },
        container: {
            flexDirection: 'row',
            position: 'relative',
            marginBottom: 10,
        },
    };
});

const ShowMoreButton = ({onPress, showMore = true, theme}: ShowMoreButtonProps) => {
    const style = getStyleSheet(theme);

    let text = 'Show less';
    if (!showMore) {
        text = 'Show more';
    }

    return (
        <View style={style.container}>
            <TouchableOpacity
                onPress={onPress}
            >
                <Text style={style.showMore}>
                    {text}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default ShowMoreButton;

