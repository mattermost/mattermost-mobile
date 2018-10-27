// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    BackHandler,
    InteractionManager,
    Keyboard,
    ScrollView,
    View,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import SafeAreaView from 'app/components/safe_area_view';
import DrawerLayout from 'app/components/sidebars/drawer_layout';
import UserStatus from 'app/components/user_status';
import {NavigationTypes} from 'app/constants';
import {confirmOutOfOfficeDisabled} from 'app/utils/status';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

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
        deviceWidth: PropTypes.number.isRequired,
        navigator: PropTypes.object,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        currentUser: {},
        status: 'offline',
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        MaterialIcon.getImageSource('close', 20, props.theme.sidebarHeaderTextColor).then((source) => {
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
        if (this.refs.drawer && this.drawerOpened) {
            this.refs.drawer.closeDrawer();
            return true;
        }

        return false;
    };

    openSettingsSidebar = () => {
        this.props.blurPostTextBox();

        if (this.refs.drawer && !this.drawerOpened) {
            this.refs.drawer.openDrawer();
        }
    };

    closeSettingsSidebar = () => {
        if (this.refs.drawer && this.drawerOpened) {
            this.refs.drawer.closeDrawer();
        }
    };

    handleDrawerClose = () => {
        this.drawerOpened = false;
        Keyboard.dismiss();
    };

    handleDrawerOpen = () => {
        this.drawerOpened = true;
        Keyboard.dismiss();
    };

    handleSetStatus = preventDoubleTap(() => {
        const items = [{
            action: () => this.setStatus(General.ONLINE),
            text: {
                id: t('mobile.set_status.online'),
                defaultMessage: 'Online',
            },
        }, {
            action: () => this.setStatus(General.AWAY),
            text: {
                id: t('mobile.set_status.away'),
                defaultMessage: 'Away',
            },
        }, {
            action: () => this.setStatus(General.DND),
            text: {
                id: t('mobile.set_status.dnd'),
                defaultMessage: 'Do Not Disturb',
            },
        }, {
            action: () => this.setStatus(General.OFFLINE),
            text: {
                id: t('mobile.set_status.offline'),
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
        const {currentUser} = this.props;
        const {formatMessage} = this.context.intl;

        this.openModal(
            'EditProfile',
            formatMessage({id: 'mobile.routes.edit_profile', defaultMessage: 'Edit Profile'}),
            {currentUser}
        );
    });

    goToFlagged = preventDoubleTap(() => {
        const {formatMessage} = this.context.intl;

        this.openModal(
            'FlaggedPosts',
            formatMessage({id: 'search_header.title3', defaultMessage: 'Flagged Posts'}),
        );
    });

    goToMentions = preventDoubleTap(() => {
        const {intl} = this.context;

        this.openModal(
            'RecentMentions',
            intl.formatMessage({id: 'search_header.title2', defaultMessage: 'Recent Mentions'}),
        );
    });

    goToSettings = preventDoubleTap(() => {
        const {intl} = this.context;

        this.openModal(
            'Settings',
            intl.formatMessage({id: 'mobile.routes.settings', defaultMessage: 'Settings'}),
        );
    });

    logout = preventDoubleTap(() => {
        const {logout} = this.props.actions;
        this.closeSettingsSidebar();
        logout();
    });

    openModal = (screen, title, passProps) => {
        const {navigator, theme} = this.props;

        this.closeSettingsSidebar();

        InteractionManager.runAfterInteractions(() => {
            navigator.showModal({
                screen,
                title,
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
                passProps,
            });
        });
    };

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

    renderNavigationView = () => {
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
                                separator={false}
                                onPress={this.handleSetStatus}
                                theme={theme}
                            />
                        </View>
                        <View style={style.separator}/>
                        <View style={style.block}>
                            <DrawerItem
                                defaultMessage='Recent Mentions'
                                i18nId='search_header.title2'
                                iconName='ios-at'
                                iconType='ion'
                                onPress={this.goToMentions}
                                separator={true}
                                theme={theme}
                            />
                            <DrawerItem
                                defaultMessage='Flagged Posts'
                                i18nId='search_header.title3'
                                iconName='ios-flag'
                                iconType='ion'
                                onPress={this.goToFlagged}
                                separator={false}
                                theme={theme}
                            />
                        </View>
                        <View style={style.separator}/>
                        <View style={style.block}>
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

    confirmReset = (status) => {
        const {intl} = this.context;
        confirmOutOfOfficeDisabled(intl, status, this.updateStatus);
    };

    updateStatus = (status) => {
        const {currentUser: {id: currentUserId}} = this.props;
        this.props.actions.setStatus({
            user_id: currentUserId,
            status,
        });
    };

    setStatus = (status) => {
        const {status: currentUserStatus, navigator} = this.props;

        if (currentUserStatus === General.OUT_OF_OFFICE) {
            navigator.dismissModal({
                animationType: 'none',
            });
            this.closeSettingsSidebar();
            this.confirmReset(status);
            return;
        }
        this.updateStatus(status);
        EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
    };

    render() {
        const {children, deviceWidth} = this.props;

        return (
            <DrawerLayout
                ref='drawer'
                renderNavigationView={this.renderNavigationView}
                onDrawerClose={this.handleDrawerClose}
                onDrawerOpen={this.handleDrawerOpen}
                drawerPosition='right'
                drawerWidth={deviceWidth - DRAWER_INITIAL_OFFSET}
                useNativeAnimations={true}
            >
                {children}
            </DrawerLayout>
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
