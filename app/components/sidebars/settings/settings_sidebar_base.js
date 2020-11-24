// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ScrollView, View} from 'react-native';

import {General} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';

import {showModal, showModalOverCurrentContext, dismissModal} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import UserStatus from '@components/user_status';
import {NavigationTypes} from '@constants';
import {confirmOutOfOfficeDisabled} from '@utils/status';
import {preventDoubleTap} from '@utils/tap';
import {t} from '@utils/i18n';

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

    goToSavedPostsScreen = (intl) => {
        this.openModal(
            'SavedPosts',
            intl.formatMessage({id: 'search_header.title3', defaultMessage: 'Saved Messages'}),
        );
    };

    goToMentionsScreen = (intl) => {
        this.openModal(
            'RecentMentions',
            intl.formatMessage({id: 'search_header.title2', defaultMessage: 'Recent Mentions'}),
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

    openModal = async (screen, title, passProps = {}) => {
        this.closeSettingsSidebar();

        if (!this.closeButton) {
            this.closeButton = await CompassIcon.getImageSource('close', 24, this.props.theme.sidebarHeaderTextColor);
        }

        const options = {
            topBar: {
                leftButtons: [{
                    testID: 'close.settings.button',
                    id: 'close-settings',
                    icon: this.closeButton,
                }],
            },
        };

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
                size={24}
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
            <View
                testID='settings.sidebar'
                style={style.container}
            >
                <ScrollView
                    alwaysBounceVertical={false}
                    contentContainerStyle={style.wrapper}
                >
                    <UserInfo
                        testID='settings.sidebar.user_info.action'
                        onPress={this.goToUserProfile}
                        user={currentUser}
                    />
                    <View style={style.block}>
                        <DrawerItem
                            testID='settings.sidebar.status.action'
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
                            testID='settings.sidebar.recent_mentions.action'
                            defaultMessage='Recent Mentions'
                            i18nId='search_header.title2'
                            iconName='at'
                            onPress={this.goToMentions}
                            separator={true}
                            theme={theme}
                        />
                        <DrawerItem
                            testID='settings.sidebar.saved_messages.action'
                            defaultMessage='Saved Messages'
                            i18nId='search_header.title3'
                            iconName='bookmark-outline'
                            onPress={this.goToSaved}
                            separator={false}
                            theme={theme}
                        />
                    </View>
                    <View style={style.separator}/>
                    <View style={style.block}>
                        <DrawerItem
                            testID='settings.sidebar.edit_profile.action'
                            defaultMessage='Edit Profile'
                            i18nId='mobile.routes.edit_profile'
                            iconName='pencil-outline'
                            onPress={this.goToEditProfile}
                            separator={true}
                            theme={theme}
                        />
                        <DrawerItem
                            testID='settings.sidebar.settings.action'
                            defaultMessage='Settings'
                            i18nId='mobile.routes.settings'
                            iconName='settings-outline'
                            onPress={this.goToSettings}
                            separator={false}
                            theme={theme}
                        />
                    </View>
                    <View style={style.separator}/>
                    <View style={style.block}>
                        <DrawerItem
                            testID='settings.sidebar.logout.action'
                            defaultMessage='Logout'
                            i18nId='sidebar_right_menu.logout'
                            iconName='exit-to-app'
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
