// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Platform, Text, View} from 'react-native';
import MathView from 'react-native-math-view';

import {makeStyleSheetFromTheme} from '@utils/theme';

export default class LatexInline extends PureComponent {
    static propTypes = {
        content: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        onLayout: PropTypes.func,
        maxMathWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        mathHeight: PropTypes.number,
    };

    onErrorMessage = (errorMsg) => {
        const style = getStyleSheet(this.props.theme);

        return <Text style={style.errorText}>{'Latex error: ' + errorMsg.message}</Text>;
    };

    onRenderErrorMessage = (errorMsg) => {
        const style = getStyleSheet(this.props.theme);

        return <Text style={style.errorText}>{'Latex render error: ' + errorMsg.error.message}</Text>;
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        const viewStyleObj = Platform.select({
            ios: () => [style.viewStyle, {height: this.props.mathHeight}],
            android: () => [style.viewStyle],
        })();

        return (
            <View
                style={viewStyleObj}
                key={this.props.content}
                onLayout={this.props.onLayout}
            >
                <MathView
                    style={[style.mathStyle, {maxWidth: this.props.maxMathWidth ? this.props.maxMathWidth : '100%'}]}
                    math={this.props.content}
                    onError={this.onErrorMessage}
                    renderError={this.onRenderErrorMessage}
                    resizeMode={'contain'}
                />
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        mathStyle: {
            marginBottom: -7,
        },
        viewStyle: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            ...Platform.select({
                ios: {
                    marginBottom: -7,
                },
            }),
        },
        errorText: {
            flexDirection: 'row',
            color: theme.errorTextColor,
            flexWrap: 'wrap',
        },
    };
});
