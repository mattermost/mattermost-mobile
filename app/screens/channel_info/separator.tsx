// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {Theme} from '@mm-redux/types/preferences';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

interface SeparatorProps {
    theme: Theme;
}

const Separator = ({theme}: SeparatorProps) => {
    const style = getStyleSheet(theme);

    return <View style={style.separator}/>;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    separator: {
        marginHorizontal: 15,
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
    },
}));

export default Separator;
