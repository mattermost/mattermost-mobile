// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    ScrollView,
    Text,
    View,
    Platform,
} from 'react-native';
import MathView from 'react-native-math-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import {splitLatexCodeInLines} from '@utils/latex';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Code from '../code/code';

export default class Latex extends Code {
    onErrorMessage = (errorMsg) => {
        const style = getStyleSheet(this.props.theme);

        return <Text style={style.errorText}>{'Error: ' + errorMsg.message}</Text>;
    };

    onRenderErrorMessage = (errorMsg) => {
        const style = getStyleSheet(this.props.theme);

        return <Text style={style.errorText}>{'Render error: ' + errorMsg.error.message}</Text>;
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        const lines = splitLatexCodeInLines(this.props.content);

        return (
            <SafeAreaView
                edges={['bottom', 'left', 'right']}
                style={style.scrollContainer}
            >
                <ScrollView
                    style={[style.scrollContainer]}
                    contentContainerStyle={style.container}
                >
                    <ScrollView
                        style={style.scrollContainer}
                        contentContainerStyle={style.scrollCode}
                        horizontal={true}
                    >
                        {lines.map((latexCode) => (
                            <View
                                style={style.code}
                                key={latexCode}
                            >
                                <MathView
                                    math={latexCode}
                                    onError={this.onErrorMessage}
                                    renderError={this.onRenderErrorMessage}
                                    resizeMode={'cover'}
                                />
                            </View>
                        ))}
                    </ScrollView>
                </ScrollView>
            </SafeAreaView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    const codeVerticalPadding = Platform.select({
        ios: 4,
        android: 0,
    });

    return {
        scrollContainer: {
            flex: 1,
        },
        container: {
            minHeight: '100%',
        },
        scrollCode: {
            minHeight: '100%',
            flexDirection: 'column',
            paddingLeft: 10,
            paddingVertical: 10,
        },
        code: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            marginHorizontal: 5,
            paddingVertical: codeVerticalPadding,
        },
        errorText: {
            fontSize: 14,
            marginHorizontal: 5,
            color: theme.errorTextColor,
        },
    };
});
