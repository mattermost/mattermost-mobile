// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {View} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class MarkdownTableRow extends React.PureComponent {
    static propTypes = {
        children: PropTypes.node,
        theme: PropTypes.object.isRequired
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        return <View style={style.row}>{this.props.children}</View>;
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
            flex: 1,
            flexDirection: 'row'
        }
    };
});
