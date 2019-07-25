// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Dimensions, Keyboard, NativeModules, View} from 'react-native';
import SafeArea from 'react-native-safe-area';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {DeviceTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';

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
        headerComponent: PropTypes.node,
        theme: PropTypes.object.isRequired,
        useLandscapeMargin: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        keyboardOffset: 0,
        useLandscapeMargin: false,
    };

    constructor(props) {
        super(props);

        this.state = {
            keyboard: false,
            safeAreaInsets: {
                top: DeviceTypes.IS_IPHONE_X ? 44 : 20,
                left: 0,
                bottom: DeviceTypes.IS_IPHONE_X || mattermostManaged.hasSafeAreaInsets ? 20 : 0,
                right: 0,
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
        EventEmitter.on('update_safe_area_view', this.getSafeAreaInsets);
        this.keyboardDidShowListener = Keyboard.addListener('keyboardWillShow', this.keyboardWillShow);
        this.keyboardDidHideListener = Keyboard.addListener('keyboardWillHide', this.keyboardWillHide);
        this.getStatusBarHeight();
    }

    componentWillUnmount() {
        this.mounted = false;
        Dimensions.removeEventListener('change', this.getSafeAreaInsets);
        EventEmitter.off('update_safe_area_view', this.getSafeAreaInsets);
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

        if (DeviceTypes.IS_IPHONE_X || mattermostManaged.hasSafeAreaInsets) {
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
        if (forceTop && DeviceTypes.IS_IPHONE_X && !hideTopBar) {
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
        const {backgroundColor, children, footerColor, footerComponent, keyboardOffset, theme, useLandscapeMargin} = this.props;
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
        if (keyboardOffset && mattermostManaged.hasSafeAreaInsets) {
            offset = keyboardOffset;
        }

        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: bgColor,
                    marginLeft: useLandscapeMargin ? safeAreaInsets.left : 0,
                    marginRight: useLandscapeMargin ? safeAreaInsets.right : 0,
                }}
            >
                {this.renderTopBar()}
                {children}
                <View style={{height: keyboard ? offset : safeAreaInsets.bottom, backgroundColor: bottomColor}}>
                    {footerComponent}
                </View>
            </View>
        );
    }
}
