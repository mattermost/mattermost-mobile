// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    BackHandler,
    ScrollView,
    Text,
    View,
    Platform,
} from 'react-native';
import MathView from 'react-native-math-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import {popTopScreen} from '@actions/navigation';
import {splitLatexCodeInLines} from '@utils/latex';
import {makeStyleSheetFromTheme} from '@utils/theme';

export default class Latex extends React.PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        content: PropTypes.string.isRequired,
    };

    componentDidMount() {
        BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    componentWillUnmount() {
        BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    handleAndroidBack = () => {
        popTopScreen();
        return true;
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
                                    onError={(errorMsg) => {
                                        return <Text style={style.errorText}>{'Error: ' + errorMsg.message}</Text>;
                                    }}
                                    renderError={(errorMsg) => {
                                        return <Text style={style.errorText}>{'Render error: ' + errorMsg.error.message}</Text>;
                                    }}
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

const getStyleSheet = makeStyleSheetFromTheme(() => {
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
            marginLeft: 5,
            paddingVertical: codeVerticalPadding,
        },
        errorText: {
            fontSize: 14,
            marginHorizontal: 5,
            color: 'rgb(255, 0, 0)',
        },
    };
});
