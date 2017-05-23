// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {IntlProvider} from 'react-intl';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {ViewTypes} from 'app/constants';
import {getTranslations} from 'app/i18n';

export default class Root extends PureComponent {
    static propTypes = {
        children: PropTypes.node,
        navigator: PropTypes.object,
        currentChannelId: PropTypes.string,
        locale: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired
    };

    componentWillMount() {
        EventEmitter.on(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
        EventEmitter.on(ViewTypes.NOTIFICATION_TAPPED, this.handleNotificationTapped);
    }

    componentWillUnmount() {
        EventEmitter.off(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
        EventEmitter.off(ViewTypes.NOTIFICATION_TAPPED, this.handleNotificationTapped);
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
                    notification
                }
            });
        }
    };

    handleNotificationTapped = () => {
        const {navigator, theme} = this.props;

        navigator.resetTo({
            screen: 'Channel',
            animated: true,
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    render() {
        const locale = this.props.locale;

        return (
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                {this.props.children}
            </IntlProvider>
        );
    }
}
