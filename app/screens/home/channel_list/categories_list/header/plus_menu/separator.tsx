// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const MARGIN_VERTICAL = 8;
const BORDER = 1;
export const SEPARATOR_HEIGHT = (MARGIN_VERTICAL * 2) + BORDER;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    separator: {
        marginTop: MARGIN_VERTICAL,
        marginBottom: MARGIN_VERTICAL,
        borderTopWidth: BORDER,
        borderStyle: 'solid',
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
}));

const PlusMenuSeparator = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.separator}/>
    );
};

export default PlusMenuSeparator;
