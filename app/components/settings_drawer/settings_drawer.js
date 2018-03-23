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
    ScrollView,
    View,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import SafeAreaView from 'app/components/safe_area_view';
import Drawer from 'app/components/drawer';
import UserStatus from 'app/components/user_status';
import {NavigationTypes} from 'app/constants';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import DrawerItem from './drawer_item';
import UserInfo from './user_info';
import StatusLabel from './status_label';

const DRAWER_INITIAL_OFFSET = 80;

export default class SettingsDrawer extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            logout: PropTypes.func.isRequired,
            setStatus: PropTypes.func.isRequired,
        }).isRequired,
        blurPostTextBox: PropTypes.func.isRequired,
        children: PropTypes.node,
        currentUser: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        currentUser: {},
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.closeHandle = null;
        this.openHandle = null;

        MaterialIcon.getImageSource('close', 20, this.props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
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
                opacity,
            },
        };
    };

    handleDrawerClose = () => {
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
        Keyboard.dismiss();

        if (this.openHandle) {
            InteractionManager.clearInteractionHandle(this.openHandle);
            this.openHandle = null;
        }
    };

    handleDrawerOpenStart = () => {
        if (!this.openHandle) {
            this.openHandle = InteractionManager.createInteractionHandle();
        }
    };

    handleSetStatus = preventDoubleTap(() => {
        const items = [{
            action: () => this.setStatus(General.ONLINE),
            text: {
                id: 'mobile.set_status.online',
                defaultMessage: 'Online',
            },
        }, {
            action: () => this.setStatus(General.AWAY),
            text: {
                id: 'mobile.set_status.away',
                defaultMessage: 'Away',
            },
        }, {
            action: () => this.setStatus(General.DND),
            text: {
                id: 'mobile.set_status.dnd',
                defaultMessage: 'Do Not Disturb',
            },
        }, {
            action: () => this.setStatus(General.OFFLINE),
            text: {
                id: 'mobile.set_status.offline',
                defaultMessage: 'Offline',
            },
        }];

        this.props.navigator.showModal({
            screen: 'OptionsModal',
            title: '',
            animationType: 'none',
            passProps: {
                items,
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext',
            },
        });
    });

    goToEditProfile = preventDoubleTap(() => {
        const {currentUser, navigator, theme} = this.props;
        const {formatMessage} = this.context.intl;

        this.closeSettingsDrawer();
        navigator.showModal({
            screen: 'EditProfile',
            title: formatMessage({id: 'mobile.routes.edit_profile', defaultMessage: 'Edit Profile'}),
            animationType: 'slide-up',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton,
                }],
            },
            passProps: {
                currentUser,
            },
        });
    });

    goToSettings = preventDoubleTap(() => {
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
                screenBackgroundColor: theme.centerChannelBg,
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton,
                }],
            },
        });
    });

    logout = preventDoubleTap(() => {
        const {logout} = this.props.actions;
        this.closeSettingsDrawer();
        InteractionManager.runAfterInteractions(logout);
    });

    renderUserStatusIcon = (userId) => {
        return (
            <UserStatus
                size={18}
                userId={userId}
            />
        );
    };

    renderUserStatusLabel = (userId) => {
        return (
            <StatusLabel userId={userId}/>
        );
    };

    renderContent = () => {
        const {currentUser, navigator, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <SafeAreaView
                backgroundColor={theme.centerChannelBg}
                navBarBackgroundColor={theme.centerChannelBg}
                footerColor={theme.centerChannelBg}
                footerComponent={<View style={style.container}/>}
                headerComponent={<View style={style.container}/>}
                navigator={navigator}
                theme={theme}
            >
                <View style={style.container}>
                    <ScrollView
                        alwaysBounceVertical={false}
                        contentContainerStyle={style.wrapper}
                    >
                        <UserInfo
                            onPress={this.goToEditProfile}
                            user={currentUser}
                        />
                        <View style={style.block}>
                            <DrawerItem
                                labelComponent={this.renderUserStatusLabel(currentUser.id)}
                                leftComponent={this.renderUserStatusIcon(currentUser.id)}
                                separator={true}
                                onPress={this.handleSetStatus}
                                theme={theme}
                            />
                            <DrawerItem
                                defaultMessage='Settings'
                                i18nId='mobile.routes.settings'
                                iconName='ios-options'
                                iconType='ion'
                                onPress={this.goToSettings}
                                separator={false}
                                theme={theme}
                            />
                        </View>
                        <View style={style.separator}/>
                        <View style={style.block}>
                            <DrawerItem
                                centered={true}
                                defaultMessage='Logout'
                                i18nId='sidebar_right_menu.logout'
                                isDestructor={true}
                                onPress={this.logout}
                                separator={false}
                                theme={theme}
                            />
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    };

    setStatus = (status) => {
        const {currentUser: {id: currentUserId}} = this.props;
        this.props.actions.setStatus({
            user_id: currentUserId,
            status,
        });
        EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
    };

    render() {
        const {children} = this.props;

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
                openDrawerOffset={DRAWER_INITIAL_OFFSET}
                onRequestClose={this.closeSettingsDrawer}
                panOpenMask={0.05}
                panCloseMask={DRAWER_INITIAL_OFFSET}
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
                            height: 0,
                        },
                    },
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
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        wrapper: {
            flex: 1,
            paddingTop: 0,
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        separator: {
            marginTop: 35,
        },
    };
});
