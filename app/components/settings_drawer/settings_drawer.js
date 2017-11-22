// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    BackHandler,
    InteractionManager,
    Keyboard,
    Platform,
    StatusBar,
    View
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import SafeAreaView from 'app/components/safe_area_view';
import Drawer from 'app/components/drawer';
import SettingsItem from 'app/screens/settings/settings_item';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const DRAWER_INITIAL_OFFSET = 80;
const DRAWER_LANDSCAPE_OFFSET = 150;

export default class SettingsDrawer extends PureComponent {
    static propTypes = {
        blurPostTextBox: PropTypes.func.isRequired,
        children: PropTypes.node,
        isLandscape: PropTypes.bool.isRequired,
        isTablet: PropTypes.bool.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired
    };

    static contextTypes = {
        intl: intlShape
    };

    constructor(props) {
        super(props);

        let openDrawerOffset = DRAWER_INITIAL_OFFSET;
        if (props.isLandscape || props.isTablet) {
            openDrawerOffset = DRAWER_LANDSCAPE_OFFSET;
        }

        this.closeHandle = null;
        this.openHandle = null;

        MaterialIcon.getImageSource('close', 20, this.props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });

        this.state = {
            openDrawerOffset
        };
    }

    componentDidMount() {
        BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    componentWillUnmount() {
        BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    handleAndroidBack = () => {
        if (this.refs.drawer && this.refs.drawer.isOpened()) {
            this.refs.drawer.close();
            return true;
        }

        return false;
    };

    openSettingsDrawer = () => {
        this.props.blurPostTextBox();

        if (this.refs.drawer && !this.refs.drawer.isOpened()) {
            this.refs.drawer.open();
        }
    };

    closeSettingsDrawer = () => {
        if (this.refs.drawer && this.refs.drawer.isOpened()) {
            this.refs.drawer.close();
        }
    };

    handleDrawerTween = (ratio) => {
        const opacity = (ratio / 2);

        EventEmitter.emit('drawer_opacity', opacity);

        return {
            mainOverlay: {
                backgroundColor: '#000',
                elevation: 3,
                opacity
            }
        };
    };

    handleDrawerClose = () => {
        if (Platform.OS === 'ios') {
            StatusBar.setHidden(false, 'slide');
        }

        if (this.closeHandle) {
            InteractionManager.clearInteractionHandle(this.closeHandle);
            this.closeHandle = null;
        }
    };

    handleDrawerCloseStart = () => {
        if (!this.closeHandle) {
            this.closeHandle = InteractionManager.createInteractionHandle();
        }
    };

    handleDrawerOpen = () => {
        if (this.state.openDrawerOffset !== 0) {
            Keyboard.dismiss();
        }

        if (this.openHandle) {
            InteractionManager.clearInteractionHandle(this.openHandle);
            this.openHandle = null;
        }
    };

    handleDrawerOpenStart = () => {
        if (Platform.OS === 'ios') {
            StatusBar.setHidden(true, 'slide');
        }

        if (!this.openHandle) {
            this.openHandle = InteractionManager.createInteractionHandle();
        }
    };

    // This is just a test
    goToAdvancedSettings = wrapWithPreventDoubleTap(() => {
        const {intl} = this.context;
        const {navigator, theme} = this.props;

        this.closeSettingsDrawer();
        navigator.showModal({
            screen: 'Settings',
            title: intl.formatMessage({id: 'mobile.routes.settings', defaultMessage: 'Settings'}),
            animationType: 'slide-up',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton
                }]
            }
        });
    });

    renderContent = () => {
        const {navigator, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <SafeAreaView
                backgroundColor={theme.centerChannelColor}
                navBarBackgroundColor={theme.centerChannelColor}
                navigator={navigator}
                theme={theme}
            >
                <View style={{flex: 1}}>
                    <View style={style.wrapper}>
                        <View style={style.divider}/>
                        <SettingsItem
                            defaultMessage='Notifications'
                            i18nId='user.settings.modal.notifications'
                            iconName='ios-notifications'
                            iconType='ion'
                            onPress={() => true}
                            showArrow={false}
                            theme={theme}
                        />
                        <SettingsItem
                            defaultMessage='Open teams you can join'
                            i18nId='mobile.select_team.join_open'
                            iconName='list'
                            iconType='foundation'
                            onPress={() => true}
                            showArrow={false}
                            theme={theme}
                        />
                        <SettingsItem
                            defaultMessage='Help'
                            i18nId='mobile.help.title'
                            iconName='md-help'
                            iconType='ion'
                            onPress={() => true}
                            showArrow={false}
                            theme={theme}
                        />
                        <SettingsItem
                            defaultMessage='Report a Problem'
                            i18nId='sidebar_right_menu.report'
                            iconName='exclamation'
                            iconType='fontawesome'
                            onPress={() => true}
                            showArrow={false}
                            theme={theme}
                        />
                        <SettingsItem
                            defaultMessage='Advanced Settings'
                            i18nId='mobile.advanced_settings.title'
                            iconName='ios-hammer'
                            iconType='ion'
                            onPress={this.goToAdvancedSettings}
                            showArrow={false}
                            theme={theme}
                        />
                        <SettingsItem
                            defaultMessage='Check for Upgrade'
                            i18nId='mobile.settings.modal.check_for_upgrade'
                            iconName='update'
                            iconType='material'
                            onPress={() => true}
                            showArrow={false}
                            theme={theme}
                        />
                        <SettingsItem
                            defaultMessage='About Mattermost'
                            i18nId='about.title'
                            iconName='ios-information-circle'
                            iconType='ion'
                            onPress={() => true}
                            separator={false}
                            showArrow={false}
                            theme={theme}
                        />
                        <View style={style.divider}/>
                        <View style={style.separator}>
                            <View style={style.divider}/>
                            <SettingsItem
                                centered={true}
                                defaultMessage='Logout'
                                i18nId='sidebar_right_menu.logout'
                                isDestructor={true}
                                onPress={() => true}
                                separator={false}
                                showArrow={false}
                                theme={theme}
                            />
                            <View style={style.divider}/>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    };

    render() {
        const {children} = this.props;
        const {openDrawerOffset} = this.state;

        return (
            <Drawer
                ref='drawer'
                onOpenStart={this.handleDrawerOpenStart}
                onOpen={this.handleDrawerOpen}
                onClose={this.handleDrawerClose}
                onCloseStart={this.handleDrawerCloseStart}
                side='right'
                captureGestures='open'
                type='overlay'
                acceptTap={true}
                acceptPanOnDrawer={false}
                disabled={false}
                content={this.renderContent()}
                tapToClose={true}
                openDrawerOffset={openDrawerOffset}
                onRequestClose={this.closeSettingsDrawer}
                panOpenMask={0.05}
                panCloseMask={openDrawerOffset}
                panThreshold={0.25}
                acceptPan={true}
                negotiatePan={true}
                useInteractionManager={false}
                tweenDuration={100}
                tweenHandler={this.handleDrawerTween}
                elevation={5}
                bottomPanOffset={Platform.OS === 'ios' ? 46 : 64}
                topPanOffset={Platform.OS === 'ios' ? 64 : 46}
                styles={{
                    main: {
                        shadowColor: '#000000',
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        shadowOffset: {
                            width: -4,
                            height: 0
                        }
                    }
                }}
            >
                {children}
            </Drawer>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        wrapper: {
            backgroundColor: theme.centerChannelColor,
            flex: 1,
            paddingTop: 44
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1
        },
        separator: {
            marginTop: 35
        }
    };
});
