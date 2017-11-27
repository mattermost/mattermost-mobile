// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Keyboard, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SafeArea from 'react-native-safe-area';
import Orientation from 'react-native-orientation';

export default class SafeAreaIos extends PureComponent {
    static propTypes = {
        backgroundColor: PropTypes.string,
        children: PropTypes.node.isRequired,
        excludeHeader: PropTypes.bool,
        forceTop: PropTypes.number,
        keyboardOffset: PropTypes.number.isRequired,
        navBarBackgroundColor: PropTypes.string,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        keyboardOffset: 0
    };

    constructor(props) {
        super(props);

        this.isX = DeviceInfo.getModel() === 'iPhone X';

        if (props.navigator) {
            props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        }

        this.state = {
            keyboard: false,
            safeAreaInsets: {
                top: 20, left: 0, bottom: 15, right: 0
            }
        };
    }

    componentWillMount() {
        this.getSafeAreaInsets();
    }

    componentDidMount() {
        Orientation.addOrientationListener(this.getSafeAreaInsets);
        this.keyboardDidShowListener = Keyboard.addListener('keyboardWillShow', this.keyboardWillShow);
        this.keyboardDidHideListener = Keyboard.addListener('keyboardWillHide', this.keyboardWillHide);
    }

    componentWillUnmount() {
        Orientation.removeOrientationListener(this.getSafeAreaInsets);
        this.keyboardDidShowListener.remove();
        this.keyboardDidHideListener.remove();
    }

    getSafeAreaInsets = () => {
        if (this.isX) {
            SafeArea.getSafeAreaInsetsForRootView().then((result) => {
                const {safeAreaInsets} = result;
                this.setState({safeAreaInsets});
            });
        }
    };

    keyboardWillHide = () => {
        this.setState({keyboard: false});
    };

    keyboardWillShow = () => {
        this.setState({keyboard: true});
    };

    onNavigatorEvent = (event) => {
        switch (event.id) {
        case 'willAppear':
        case 'didDisappear':
            this.getSafeAreaInsets();
            break;
        }
    };

    render() {
        const {backgroundColor, children, excludeHeader, forceTop, keyboardOffset, navBarBackgroundColor, theme} = this.props;
        const {keyboard, safeAreaInsets} = this.state;

        let bgColor = theme.centerChannelBg;
        if (backgroundColor) {
            bgColor = backgroundColor;
        }

        let topColor = theme.sidebarHeaderBg;
        if (navBarBackgroundColor) {
            topColor = navBarBackgroundColor;
        }

        let offset = 0;
        if (keyboardOffset && this.isX) {
            offset = keyboardOffset;
        }

        let top = safeAreaInsets.top;
        if (forceTop && this.isX && !excludeHeader) {
            top = forceTop;
        }

        return (
            <View
                style={{
                    flex: 1,
                    paddingBottom: keyboard ? offset : safeAreaInsets.bottom - 15,
                    backgroundColor: bgColor
                }}
            >
                {!excludeHeader &&
                <View
                    style={{
                        backgroundColor: topColor,
                        paddingTop: top,
                        zIndex: 10
                    }}
                />
                }
                {children}
            </View>
        );
    }
}
