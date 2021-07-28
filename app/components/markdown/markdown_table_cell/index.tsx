// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, ReactNode} from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export const CELL_MIN_WIDTH = 96;
export const CELL_MAX_WIDTH = 192;

export type MarkdownTableCellProps = {
    align: 'left' | 'center' | 'right';
    children: ReactNode;
    isLastCell: boolean;
};

const MarkdownTableCell = ({isLastCell, align, children}: MarkdownTableCellProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const cellStyle = [style.cell];
    if (!isLastCell) {
        cellStyle.push(style.cellRightBorder);
    }

    let textStyle = null;
    if (align === 'center') {
        textStyle = style.alignCenter;
    } else if (align === 'right') {
        textStyle = style.alignRight;
    }

    return (
        <View style={[cellStyle, textStyle]}>
            {children}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        cell: {
            flex: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            justifyContent: 'flex-start',
            padding: 8,
        },
        cellRightBorder: {
            borderRightWidth: 1,
        },
        alignCenter: {
            alignItems: 'center',
        },
        alignRight: {
            alignItems: 'flex-end',
        },
    };
});

export default memo(MarkdownTableCell);
