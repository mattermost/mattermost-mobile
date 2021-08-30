// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Text, View} from 'react-native';
import MathView from 'react-native-math-view';

import {makeStyleSheetFromTheme} from '@utils/theme';

export default class LatexInline extends PureComponent {
    static propTypes = {
        content: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        onLayout: PropTypes.func,
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        return (
            <View
                style={style.viewStyle}
            >
                <MathView
                    style={style.mathStyle}
                    math={this.props.content}
                    onLayout={this.props.onLayout}
                    onError={(errorMsg) => {
                        return <Text style={style.errorText}>{'Latex error: ' + errorMsg.message}</Text>;
                    }}
                    renderError={(errorMsg) => {
                        return <Text style={style.errorText}>{'Latex render error: ' + errorMsg.error.message}</Text>;
                    }}
                    resizeMode={'cover'}
                />
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        mathStyle: {
            flexWrap: 'wrap',
            overflow: 'visible',
        },
        viewStyle: {
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            maxHeight: 20,
        },
        errorText: {
            color: 'rgb(255, 0, 0)',
        },
    };
});
