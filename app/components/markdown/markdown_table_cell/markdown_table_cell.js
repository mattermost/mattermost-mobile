// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Text, View} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class MarkdownTableCell extends React.PureComponent {
    static propTypes = {
        children: PropTypes.node,
        isHeading: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        const cellStyle = [style.cell];
        if (this.props.isHeading) {
            cellStyle.push(style.heading);
        }

        return (
            <View style={cellStyle}>
                <Text>
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
            borderRightWidth: 1,
            flex: 1,
            justifyContent: 'flex-start',
            paddingHorizontal: 13,
            paddingVertical: 6,
        },
    };
});
