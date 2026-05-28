// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';
import {View} from 'react-native';

import {MmBlocksChildLayoutContext} from './context';
import {getStyleSheet} from './styles';

type DividerBlockProps = {
    theme: Theme;
};

export const DividerBlock = ({theme}: DividerBlockProps) => {
    const style = getStyleSheet(theme);
    const childLayout = useContext(MmBlocksChildLayoutContext);
    if (childLayout === 'row') {
        return <View style={style.dividerVertical}/>;
    }
    return <View style={style.divider}/>;
};
