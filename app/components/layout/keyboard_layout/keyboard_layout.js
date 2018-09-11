// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Keyboard, Platform, View} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class KeyboardLayout extends PureComponent {
    static propTypes = {
        children: PropTypes.node,
        statusBarHeight: PropTypes.number,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        keyboardVerticalOffset: 0,
    };

    constructor(props) {
        super(props);
        this.subscriptions = [];
        this.count = 0;
        this.state = {
            bottom: 0,
        };
    }

    componentWillMount() {
        if (Platform.OS === 'ios') {
            this.subscriptions = [
                Keyboard.addListener('keyboardWillChangeFrame', this.onKeyboardChange),
                Keyboard.addListener('keyboardWillHide', this.onKeyboardWillHide),
            ];
        }
    }

    componentWillUnmount() {
        this.subscriptions.forEach((sub) => sub.remove());
    }

    onKeyboardWillHide = () => {
        this.setState({bottom: 0});
    };

    onKeyboardChange = (e) => {
        if (!e) {
            this.setState({bottom: 0});
            return;
        }

        const {endCoordinates} = e;
        const {height} = endCoordinates;

        this.setState({bottom: height});
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
            <View
                style={[style.keyboardLayout, {marginBottom: this.state.bottom}]}
            >
                {children}
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        keyboardLayout: {
            position: 'relative',
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
    };
});
