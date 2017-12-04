// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Keyboard, Platform, View} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

const {View: AnimatedView} = Animated;

export default class KeyboardLayout extends PureComponent {
    static propTypes = {
        children: PropTypes.node,
        statusBarHeight: PropTypes.number,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        keyboardVerticalOffset: 0
    };

    constructor(props) {
        super(props);
        this.subscriptions = [];
        this.state = {
            bottom: new Animated.Value(0)
        };
    }

    componentWillMount() {
        if (Platform.OS === 'ios') {
            this.subscriptions = [
                Keyboard.addListener('keyboardWillChangeFrame', this.onKeyboardChange)
            ];
        }
    }

    componentWillUnmount() {
        this.subscriptions.forEach((sub) => sub.remove());
    }

    onKeyboardChange = (e) => {
        if (!e) {
            this.setState({bottom: new Animated.Value(0)});
            return;
        }

        const {endCoordinates, duration, startCoordinates} = e;

        let height = 0;
        if (startCoordinates.height < endCoordinates.height) {
            height = endCoordinates.height;
        }

        Animated.timing(this.state.bottom, {
            toValue: height,
            duration
        }).start();
    };

    render() {
        const {children, theme, ...otherProps} = this.props;
        const style = getStyleFromTheme(theme);

        if (Platform.OS === 'android') {
            return (
                <View
                    style={style.keyboardLayout}
                    {...otherProps}
                >
                    {children}
                </View>
            );
        }

        return (
            <AnimatedView
                style={[style.keyboardLayout, {bottom: this.state.bottom}]}
            >
                {children}
            </AnimatedView>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        keyboardLayout: {
            position: 'relative',
            backgroundColor: theme.centerChannelBg,
            flex: 1
        }
    };
});
