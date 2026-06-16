// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {getStyleSheet} from './styles';

type DividerBlockProps = {
    currentLayout?: 'column' | 'row';
    theme: Theme;
};

export const DividerBlock = ({currentLayout = 'column', theme}: DividerBlockProps) => {
    const style = getStyleSheet(theme);
    if (currentLayout === 'row') {
        return <View style={style.dividerVertical}/>;
    }
    return <View style={style.divider}/>;
};
