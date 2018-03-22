// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {IntlProvider} from 'react-intl';
import {Platform} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes, ViewTypes} from 'app/constants';
import {getTranslations} from 'app/i18n';

export default class Root extends PureComponent {
    static propTypes = {
        children: PropTypes.node,
        navigator: PropTypes.object,
        excludeEvents: PropTypes.bool,
        currentChannelId: PropTypes.string,
        currentUrl: PropTypes.string,
        locale: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    componentWillMount() {
        if (!this.props.excludeEvents) {
            EventEmitter.on(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
            EventEmitter.on(ViewTypes.NOTIFICATION_TAPPED, this.handleNotificationTapped);
            EventEmitter.on(NavigationTypes.NAVIGATION_NO_TEAMS, this.handleNoTeams);
        }
    }

    componentWillUnmount() {
        if (!this.props.excludeEvents) {
            EventEmitter.off(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
            EventEmitter.off(ViewTypes.NOTIFICATION_TAPPED, this.handleNotificationTapped);
            EventEmitter.off(NavigationTypes.NAVIGATION_NO_TEAMS, this.handleNoTeams);
        }
    }

    handleInAppNotification = (notification) => {
        const {data} = notification;
        const {currentChannelId, navigator} = this.props;

        if (data.channel_id !== currentChannelId) {
            navigator.showInAppNotification({
                screen: 'Notification',
                position: 'top',
                autoDismissTimerSec: 5,
                dismissWithSwipe: true,
                passProps: {
                    notification,
                },
            });
        }
    };

    handleNoTeams = () => {
        if (!this.refs.provider) {
            setTimeout(this.handleNoTeams, 200);
            return;
        }

        const {currentUrl, navigator, theme} = this.props;
        const {intl} = this.refs.provider.getChildContext();

        let navigatorButtons;
        if (Platform.OS === 'android') {
            navigatorButtons = {
                rightButtons: [{
                    title: intl.formatMessage({id: 'sidebar_right_menu.logout', defaultMessage: 'Logout'}),
                    id: 'logout',
                    buttonColor: theme.sidebarHeaderTextColor,
                    showAsAction: 'always',
                }],
            };
        } else {
            navigatorButtons = {
                leftButtons: [{
                    title: intl.formatMessage({id: 'sidebar_right_menu.logout', defaultMessage: 'Logout'}),
                    id: 'logout',
                    buttonColor: theme.sidebarHeaderTextColor,
                }],
            };
        }

        navigator.resetTo({
            screen: 'SelectTeam',
            title: intl.formatMessage({id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'}),
            animated: false,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            navigatorButtons,
            passProps: {
                currentUrl,
                userWithoutTeams: true,
                theme,
            },
        });
    };

    handleNotificationTapped = async () => {
        const {navigator} = this.props;

        if (Platform.OS === 'android') {
            navigator.dismissModal({animation: 'none'});
        }

        navigator.popToRoot({
            animated: false,
        });
    };

    render() {
        const locale = this.props.locale;

        return (
            <IntlProvider
                ref='provider'
                locale={locale}
                messages={getTranslations(locale)}
            >
                {this.props.children}
            </IntlProvider>
        );
    }
}
