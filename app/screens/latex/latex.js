// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    BackHandler,
    ScrollView,
    Text,
} from 'react-native';
import MathView, {MathText} from 'react-native-math-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import {popTopScreen} from '@actions/navigation';
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

        let lines = this.props.content.split('\\\\');

        lines = joinNonLineBreaks(lines);

        return (
            <SafeAreaView
                edges={['bottom', 'left', 'right']}
                style={style.scrollContainer}
            >
                <ScrollView
                    style={style.scrollContainer}
                    contentContainerStyle={style.code}
                >
                    {lines.map((latexCode) => (
                        <MathView
                            style={{maxHeight: 30, overflow: 'scroll'}}
                            config={{ex: 50, em: 200}}
                            key={latexCode}
                            math={latexCode}
                            onError={({error}) => <Text>{error}</Text>}
                            renderError={({error}) => <Text>{error}</Text>}
                            resizeMode={'contain'}
                        />
                    ))}
                </ScrollView>
            </SafeAreaView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        scrollContainer: {
            flex: 1,
            overflow: 'scroll',
        },
        container: {
            minHeight: '100%',
        },
        code: {
            minHeight: '100%',
            flexDirection: 'column',
            paddingHorizontal: 6,
        },
    };
});

/**
 * There is no new line in Latex if the line break occurs inside of curly brackets. This function joins these lines back together.
 */
function joinNonLineBreaks(lines) {
    let outLines = lines.slice();

    let i = 0;
    while (i < outLines.length) {
        if (outLines[i].split('{').length === outLines[i].split('}').length) { //Line has no linebreak in between brackets
            i += 1;
        } else if (i < outLines.length - 2) {
            outLines = outLines.slice(0, i).concat([outLines[i] + outLines[i + 1]], outLines.slice(i + 2));
        } else if (i === outLines.length - 2) {
            outLines = outLines.slice(0, i).concat([outLines[i] + outLines[i + 1]]);
        } else {
            return outLines;
        }
    }

    return outLines;
}
