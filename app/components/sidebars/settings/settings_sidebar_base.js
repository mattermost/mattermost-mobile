// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ScrollView, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {General} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';

import {showModal, showModalOverCurrentContext, dismissModal} from 'app/actions/navigation';
import UserStatus from 'app/components/user_status';
import {NavigationTypes} from 'app/constants';
import {confirmOutOfOfficeDisabled} from 'app/utils/status';
import {preventDoubleTap} from 'app/utils/tap';
import {t} from 'app/utils/i18n';

import DrawerItem from './drawer_item';
import UserInfo from './user_info';
import StatusLabel from './status_label';

export default class SettingsSidebarBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            logout: PropTypes.func.isRequired,
            setStatus: PropTypes.func.isRequired,
        }).isRequired,
        currentUser: PropTypes.object.isRequired,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        currentUser: {},
        status: 'offline',
    };

    componentDidMount() {
        this.mounted = true;
        EventEmitter.on(NavigationTypes.CLOSE_SETTINGS_SIDEBAR, this.closeSettingsSidebar);
    }

    componentWillUnmount() {
        this.mounted = false;
        EventEmitter.off(NavigationTypes.CLOSE_SETTINGS_SIDEBAR, this.closeSettingsSidebar);
    }

    confirmResetBase = (status, intl) => {
        confirmOutOfOfficeDisabled(intl, status, this.updateStatus);
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

        this.statusModal = true;
        showModalOverCurrentContext('OptionsModal', {items});
    });

    goToEditProfileScreen = (intl) => {
        const {currentUser} = this.props;
        const commandType = 'ShowModal';

        this.openModal(
            'EditProfile',
            intl.formatMessage({id: 'mobile.routes.edit_profile', defaultMessage: 'Edit Profile'}),
            {currentUser, commandType},
        );
    };

    goToFlaggedScreen = (intl) => {
        this.openModal(
            'FlaggedPosts',
            intl.formatMessage({id: 'search_header.title3', defaultMessage: 'Flagged Posts'}),
            {},
            true,
        );
    };

    goToMentionsScreen = (intl) => {
        this.openModal(
            'RecentMentions',
            intl.formatMessage({id: 'search_header.title2', defaultMessage: 'Recent Mentions'}),
            {},
            true,
        );
    };

    goToUserProfileScreen = (intl) => {
        const userId = this.props.currentUser.id;

        this.openModal(
            'UserProfile',
            intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
            {userId},
        );
    };

    goToSettingsScreeen = (intl) => {
        this.openModal(
            'Settings',
            intl.formatMessage({id: 'mobile.routes.settings', defaultMessage: 'Settings'}),
        );
    };

    logout = preventDoubleTap(() => {
        const {logout} = this.props.actions;
        this.closeSettingsSidebar();
        logout();
    });

    openModal = async (screen, title, passProps = {}, alignTitleCenter = false) => {
        this.closeSettingsSidebar();

        if (!this.closeButton) {
            this.closeButton = await MaterialIcon.getImageSource('close', 20, this.props.theme.sidebarHeaderTextColor);
        }

        var options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton,
                }],
            },
        };

        if (alignTitleCenter) {
            options.topBar.title = {
                alignment: 'center',
            };
        }

        showModal(screen, title, passProps, options);
    };

    updateStatus = (status) => {
        const {currentUser: {id: currentUserId}} = this.props;
        this.props.actions.setStatus({
            user_id: currentUserId,
            status,
        });
    };

    setStatus = (status) => {
        const {status: currentUserStatus} = this.props;

        if (currentUserStatus === General.OUT_OF_OFFICE) {
            dismissModal();
            this.closeSettingsSidebar();
            this.confirmReset(status);
            return;
        }
        this.updateStatus(status);
        EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
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

    renderOptions = (style) => {
        const {currentUser, theme} = this.props;

        return (
            <View style={style.container}>
                <ScrollView
                    alwaysBounceVertical={false}
                    contentContainerStyle={style.wrapper}
                >
                    <UserInfo
                        onPress={this.goToUserProfile}
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
                            defaultMessage='Edit Profile'
                            i18nId='mobile.routes.edit_profile'
                            iconName='ios-person'
                            iconType='ion'
                            onPress={this.goToEditProfile}
                            separator={true}
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
        );
    };

    render() {
        return; // eslint-disable-line no-useless-return
    }
}
