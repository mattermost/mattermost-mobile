// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {
    BackHandler,
    InteractionManager,
    Keyboard,
    Platform,
    View,
} from 'react-native';

import Drawer from 'react-native-drawer';
import {intlShape, injectIntl} from 'react-intl';

import SettingsItem from 'app/screens/settings/settings_item';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const DRAWER_INITIAL_OFFSET = 80;
const DRAWER_LANDSCAPE_OFFSET = 150;

class SettingsDrawer extends Component {
    constructor(props) {
        super(props);

        let openDrawerOffset = DRAWER_INITIAL_OFFSET;
        if (props.isLandscape || props.isTablet) {
            openDrawerOffset = DRAWER_LANDSCAPE_OFFSET;
        }
        this.state = {
            openDrawerOffset
        };
    }

    componentDidMount() {
        EventEmitter.on('open_settings_drawer', this.openSettingsDrawer);
        EventEmitter.on('close_settings_drawer', this.closeSettingsDrawer);
        BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    componentWillUnmount() {
        EventEmitter.off('open_settings_drawer', this.openSettingsDrawer);
        EventEmitter.off('close_settings_drawer', this.closeSettingsDrawer);
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
        // this.resetDrawer();

        if (this.closeLeftHandle) {
            InteractionManager.clearInteractionHandle(this.closeLeftHandle);
            this.closeLeftHandle = null;
        }
    };

    handleDrawerCloseStart = () => {
        if (!this.closeLeftHandle) {
            this.closeLeftHandle = InteractionManager.createInteractionHandle();
        }
    };

    handleDrawerOpen = () => {
        if (this.state.openDrawerOffset !== 0) {
            Keyboard.dismiss();
        }

        if (this.openLeftHandle) {
            InteractionManager.clearInteractionHandle(this.openLeftHandle);
            this.openLeftHandle = null;
        }
    };

    handleDrawerOpenStart = () => {
        if (!this.openLeftHandle) {
            this.openLeftHandle = InteractionManager.createInteractionHandle();
        }
    };

    renderContent = () => {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={{flex: 1, backgroundColor: 'white'}}>
                <View style={style.wrapper}>
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Notifications'
                        i18nId='user.settings.modal.notifications'
                        iconName='ios-notifications'
                        iconType='ion'
                        onPress={() => this.handlePress(this.goToNotifications)}
                        showArrow={false}
                        theme={theme}
                    />
                    {true &&
                    <SettingsItem
                        defaultMessage='Open teams you can join'
                        i18nId='mobile.select_team.join_open'
                        iconName='list'
                        iconType='foundation'
                        onPress={() => this.handlePress(this.goToSelectTeam)}
                        showArrow={false}
                        theme={theme}
                    />
                    }
                    {true &&
                    <SettingsItem
                        defaultMessage='Help'
                        i18nId='mobile.help.title'
                        iconName='md-help'
                        iconType='ion'
                        onPress={() => this.handlePress(this.openHelp)}
                        showArrow={false}
                        theme={theme}
                    />
                    }
                    <SettingsItem
                        defaultMessage='Report a Problem'
                        i18nId='sidebar_right_menu.report'
                        iconName='exclamation'
                        iconType='fontawesome'
                        onPress={() => this.handlePress(this.openErrorEmail)}
                        showArrow={false}
                        theme={theme}
                    />
                    <SettingsItem
                        defaultMessage='Advanced Settings'
                        i18nId='mobile.advanced_settings.title'
                        iconName='ios-hammer'
                        iconType='ion'
                        onPress={() => this.handlePress(this.goToAdvancedSettings)}
                        showArrow={false}
                        theme={theme}
                    />
                    {false &&
                    <SettingsItem
                        defaultMessage='Check for Upgrade'
                        i18nId='mobile.settings.modal.check_for_upgrade'
                        iconName='update'
                        iconType='material'
                        onPress={() => this.handlePress(this.goToClientUpgrade)}
                        showArrow={false}
                        theme={theme}
                    />
                    }
                    <SettingsItem
                        defaultMessage='About Mattermost'
                        i18nId='about.title'
                        iconName='ios-information-circle'
                        iconType='ion'
                        onPress={() => this.handlePress(this.goToAbout)}
                        separator={false}
                        showArrow={false}
                        theme={theme}
                    />
                    <View style={style.divider}/>
                    <View style={style.seperator}>
                        <View style={style.divider}/>
                        <SettingsItem
                            centered={true}
                            defaultMessage='Logout'
                            i18nId='sidebar_right_menu.logout'
                            isDestructor={true}
                            onPress={() => this.handlePress(this.logout)}
                            separator={false}
                            showArrow={false}
                            theme={theme}
                        />
                        <View style={style.divider}/>
                    </View>
                </View>
            </View>
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
                panOpenMask={0.2}
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
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            ...Platform.select({
                ios: {
                    paddingTop: 35
                }
            })
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1
        },
        seperator: {
            marginTop: 35
        }
    };
});

export default injectIntl(SettingsDrawer);
