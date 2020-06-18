// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Dimensions, Keyboard, NativeModules, View} from 'react-native';
import SafeArea from 'react-native-safe-area';

import EventEmitter from '@mm-redux/utils/event_emitter';

import {DeviceTypes, ViewTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import EphemeralStore from 'app/store/ephemeral_store';

const {StatusBarManager} = NativeModules;
const {PORTRAIT, LANDSCAPE} = ViewTypes;

export default class SafeAreaIos extends PureComponent {
    static propTypes = {
        backgroundColor: PropTypes.string,
        children: PropTypes.node.isRequired,
        excludeHeader: PropTypes.bool,
        excludeFooter: PropTypes.bool,
        footerColor: PropTypes.string,
        footerComponent: PropTypes.node,
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

        const insetTop = DeviceTypes.IS_IPHONE_WITH_INSETS ? 44 : 20;
        let insetBottom = 0;
        if ((DeviceTypes.IS_IPHONE_WITH_INSETS || mattermostManaged.hasSafeAreaInsets) && props.excludeFooter) {
            insetBottom = 20;
        }

        this.state = {
            keyboard: false,
            safeAreaInsets: {
                top: insetTop,
                left: 0,
                bottom: insetBottom,
                right: 0,
            },
        };

        this.topBarHeight = new Animated.Value(insetTop);
    }

    componentDidMount() {
        this.mounted = true;

        Dimensions.addEventListener('change', this.getSafeAreaInsets);
        EventEmitter.on('update_safe_area_view', this.getSafeAreaInsets);
        if (EphemeralStore.safeAreaInsets[PORTRAIT] === null || EphemeralStore.safeAreaInsets[LANDSCAPE] === null) {
            SafeArea.addEventListener('safeAreaInsetsForRootViewDidChange', this.onSafeAreaInsetsForRootViewChange);
        }

        this.keyboardDidShowListener = Keyboard.addListener('keyboardWillShow', this.keyboardWillShow);
        this.keyboardDidHideListener = Keyboard.addListener('keyboardWillHide', this.keyboardWillHide);

        this.getSafeAreaInsets();
    }

    componentWillUnmount() {
        Dimensions.removeEventListener('change', this.getSafeAreaInsets);
        EventEmitter.off('update_safe_area_view', this.getSafeAreaInsets);
        SafeArea.removeEventListener('safeAreaInsetsForRootViewDidChange', this.onSafeAreaInsetsForRootViewChange);
        this.keyboardDidShowListener.remove();
        this.keyboardDidHideListener.remove();

        this.mounted = false;
    }

    getSafeAreaInsets = async (dimensions) => {
        this.getStatusBarHeight();

        if (DeviceTypes.IS_IPHONE_WITH_INSETS || mattermostManaged.hasSafeAreaInsets) {
            const window = dimensions?.window || Dimensions.get('window');
            const orientation = window.width > window.height ? LANDSCAPE : PORTRAIT;
            const {safeAreaInsets} = await SafeArea.getSafeAreaInsetsForRootView();
            this.setSafeAreaInsets(safeAreaInsets, orientation);
        }
    }

    setSafeAreaInsets = (safeAreaInsets, orientation) => {
        if (EphemeralStore.safeAreaInsets[orientation] === null) {
            EphemeralStore.safeAreaInsets[orientation] = safeAreaInsets;
        }

        if (this.mounted) {
            this.setState({
                safeAreaInsets: EphemeralStore.safeAreaInsets[orientation],
            });
        }
    }

    getStatusBarHeight = () => {
        try {
            StatusBarManager.getHeight(
                (statusBarFrameData) => {
                    if (this.mounted) {
                        if (statusBarFrameData.height === 0) {
                            this.hideTopBar();
                        } else {
                            this.showTopBar();
                        }
                    }
                },
            );
        } catch (e) {
            // not needed
        }
    };

    onSafeAreaInsetsForRootViewChange = ({safeAreaInsets}) => {
        if (EphemeralStore.safeAreaInsets[PORTRAIT] !== null && EphemeralStore.safeAreaInsets[LANDSCAPE] !== null) {
            SafeArea.removeEventListener('safeAreaInsetsForRootViewDidChange', this.onSafeAreaInsetsForRootViewChange);
            return;
        }

        if (DeviceTypes.IS_IPHONE_WITH_INSETS || mattermostManaged.hasSafeAreaInsets) {
            this.getStatusBarHeight();

            const {width, height} = Dimensions.get('window');
            const orientation = width > height ? LANDSCAPE : PORTRAIT;
            this.setSafeAreaInsets(safeAreaInsets, orientation);
        }
    }

    keyboardWillHide = () => {
        this.setState({keyboard: false});
    };

    keyboardWillShow = () => {
        this.setState({keyboard: true});
    };

    hideTopBar = () => {
        Animated.timing(this.topBarHeight, {
            toValue: 10,
            duration: 350,
            useNativeDriver: false,
        }).start();
    }

    showTopBar = () => {
        Animated.timing(this.topBarHeight, {
            toValue: this.state.safeAreaInsets.top,
            duration: 350,
            useNativeDriver: false,
        }).start();
    }

    renderTopBar = () => {
        const {headerComponent, excludeHeader, navBarBackgroundColor, theme} = this.props;

        if (excludeHeader) {
            return null;
        }

        let topColor = theme.sidebarHeaderBg;
        if (navBarBackgroundColor) {
            topColor = navBarBackgroundColor;
        }

        if (headerComponent) {
            return (
                <Animated.View
                    style={{
                        backgroundColor: topColor,
                        height: this.topBarHeight,
                        zIndex: 10,
                    }}
                >
                    {headerComponent}
                </Animated.View>
            );
        }

        return (
            <Animated.View
                style={{
                    backgroundColor: topColor,
                    paddingTop: this.topBarHeight,
                    zIndex: 10,
                }}
            />
        );
    };

    render() {
        const {backgroundColor, children, excludeFooter, footerColor, footerComponent, keyboardOffset, theme, useLandscapeMargin} = this.props;
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

        let bottomInset = safeAreaInsets.bottom;
        if (excludeFooter) {
            bottomInset = 0;
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
                <View style={{height: keyboard ? offset : bottomInset, backgroundColor: bottomColor}}>
                    {footerComponent}
                </View>
            </View>
        );
    }
}
