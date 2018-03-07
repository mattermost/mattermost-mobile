// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {View} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class MarkdownTableRow extends React.PureComponent {
    static propTypes = {
        children: PropTypes.node,
        isLastRow: PropTypes.bool,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        const rowStyle = [style.row];
        if (!this.props.isLastRow) {
            rowStyle.push(style.rowBottomBorder);
        }

        return <View style={rowStyle}>{this.props.children}</View>;
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-start',
        },
        rowBottomBorder: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
        },
    };
});
