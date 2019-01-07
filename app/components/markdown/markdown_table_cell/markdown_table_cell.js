// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Text, View} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export const CELL_WIDTH = 100;

export default class MarkdownTableCell extends React.PureComponent {
    static propTypes = {
        align: PropTypes.oneOf(['', 'left', 'center', 'right']),
        children: PropTypes.node,
        isLastCell: PropTypes.bool,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        const cellStyle = [style.cell];
        if (!this.props.isLastCell) {
            cellStyle.push(style.cellRightBorder);
        }

        let textStyle = null;
        if (this.props.align === 'center') {
            textStyle = style.alignCenter;
        } else if (this.props.align === 'right') {
            textStyle = style.alignRight;
        }

        return (
            <View style={cellStyle}>
                <Text style={textStyle}>
                    {this.props.children}
                </Text>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        cell: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            width: CELL_WIDTH,
            justifyContent: 'flex-start',
            paddingHorizontal: 13,
            paddingVertical: 6,
        },
        cellRightBorder: {
            borderRightWidth: 1,
        },
        alignCenter: {
            textAlign: 'center',
        },
        alignRight: {
            textAlign: 'right',
        },
    };
});
