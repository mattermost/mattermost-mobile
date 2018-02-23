// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';

import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

export default class AutocompleteDivider extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
    };

    render() {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <View style={style.divider}/>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        divider: {
            height: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});
