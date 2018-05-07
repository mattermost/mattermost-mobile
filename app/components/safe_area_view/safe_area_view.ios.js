// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Dimensions, Keyboard, NativeModules, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SafeArea from 'react-native-safe-area';

const {StatusBarManager} = NativeModules;

export default class SafeAreaIos extends PureComponent {
    static propTypes = {
        backgroundColor: PropTypes.string,
        children: PropTypes.node.isRequired,
        excludeHeader: PropTypes.bool,
        footerColor: PropTypes.string,
        footerComponent: PropTypes.node,
        forceTop: PropTypes.number,
        keyboardOffset: PropTypes.number.isRequired,
        navBarBackgroundColor: PropTypes.string,
        navigator: PropTypes.object,
        headerComponent: PropTypes.node,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        keyboardOffset: 0,
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
                top: 20, left: 0, bottom: 15, right: 0,
            },
            statusBarHeight: 20,
        };
    }

    componentWillMount() {
        this.mounted = true;
        this.getSafeAreaInsets();
        this.mounted = true;
    }

    componentDidMount() {
        Dimensions.addEventListener('change', this.getSafeAreaInsets);
        this.keyboardDidShowListener = Keyboard.addListener('keyboardWillShow', this.keyboardWillShow);
        this.keyboardDidHideListener = Keyboard.addListener('keyboardWillHide', this.keyboardWillHide);
        this.getStatusBarHeight();
    }

    componentWillUnmount() {
        this.mounted = false;
        Dimensions.removeEventListener('change', this.getSafeAreaInsets);
        this.keyboardDidShowListener.remove();
        this.keyboardDidHideListener.remove();
        this.mounted = false;
    }

    getStatusBarHeight = () => {
        try {
            StatusBarManager.getHeight(
                (statusBarFrameData) => {
                    if (this.mounted) {
                        this.setState({statusBarHeight: statusBarFrameData.height});
                    }
                }
            );
        } catch (e) {
            // not needed
        }
    };

    getSafeAreaInsets = () => {
        this.getStatusBarHeight();

        if (this.isX) {
            SafeArea.getSafeAreaInsetsForRootView().then((result) => {
                const {safeAreaInsets} = result;
                if (this.mounted) {
                    this.setState({safeAreaInsets});
                }
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

    renderTopBar = () => {
        const {safeAreaInsets, statusBarHeight} = this.state;
        const {headerComponent, excludeHeader, forceTop, navBarBackgroundColor, theme} = this.props;
        const hideTopBar = excludeHeader || !statusBarHeight;

        if (hideTopBar) {
            return null;
        }

        let topColor = theme.sidebarHeaderBg;
        if (navBarBackgroundColor) {
            topColor = navBarBackgroundColor;
        }

        let top = safeAreaInsets.top;
        if (forceTop && this.isX && !hideTopBar) {
            top = forceTop;
        }

        if (headerComponent) {
            return (
                <View
                    style={{
                        backgroundColor: topColor,
                        height: top,
                        zIndex: 10,
                    }}
                >
                    {headerComponent}
                </View>
            );
        }

        return (
            <View
                style={{
                    backgroundColor: topColor,
                    paddingTop: top,
                    zIndex: 10,
                }}
            />
        );
    };

    render() {
        const {backgroundColor, children, footerColor, footerComponent, keyboardOffset, theme} = this.props;
        const {keyboard, safeAreaInsets} = this.state;

        let bgColor = theme.centerChannelBg;
        if (backgroundColor) {
            bgColor = backgroundColor;
        }

        let bottomColor = theme.centerChannelBg;
        if (footerColor) {
            bottomColor = footerColor;
        }

        let offset = 0;
        if (keyboardOffset && this.isX) {
            offset = keyboardOffset;
        }

        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: bgColor,
                }}
            >
                {this.renderTopBar()}
                {children}
                <View style={{height: keyboard ? offset : safeAreaInsets.bottom - 15, backgroundColor: bottomColor}}>
                    {footerComponent}
                </View>
            </View>
        );
    }
}
