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
        maxMathWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        return (
            <View
                style={[style.viewStyle]}
                key={this.props.content}
                onLayout={this.props.onLayout}
            >
                <MathView
                    style={[style.mathStyle, {maxWidth: this.props.maxMathWidth}]}
                    math={this.props.content}
                    onError={(errorMsg) => {
                        return <Text style={style.errorText}>{'Latex error: ' + errorMsg.message}</Text>;
                    }}
                    renderError={(errorMsg) => {
                        return <Text style={style.errorText}>{'Latex render error: ' + errorMsg.error.message}</Text>;
                    }}
                    resizeMode={'contain'}
                />
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        mathStyle: {
            marginBottom: -7,
        },
        viewStyle: {
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        errorText: {
            flexDirection: 'row',
            color: 'rgb(255, 0, 0)',
            flexWrap: 'wrap',
        },
    };
});
