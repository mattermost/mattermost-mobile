// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    BackHandler,
    ScrollView,
    Text,
} from 'react-native';
import MathView from 'react-native-math-view';
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

        return (
            <SafeAreaView
                edges={['bottom', 'left', 'right']}
                style={style.scrollContainer}
            >
                <ScrollView
                    style={[style.scrollContainer]}
                    contentContainerStyle={style.code}
                >
                    <MathView
                        math={this.props.content}
                        onError={({error}) => <Text style={[{fontWeight: 'bold'}]}>{error}</Text>}
                        renderError={({error}) => <Text style={[{fontWeight: 'bold'}]}>{error}</Text>}
                    />
                </ScrollView>
            </SafeAreaView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        scrollContainer: {
            flex: 1,
        },
        container: {
            minHeight: '100%',
            flexDirection: 'row',
        },
        code: {
            minHeight: '100%',
            flexDirection: 'row',
            paddingHorizontal: 6,
        },
    };
});
