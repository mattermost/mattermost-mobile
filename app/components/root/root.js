// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {IntlProvider} from 'react-intl';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {ViewTypes} from 'app/constants';
import {getTranslations} from 'app/i18n';

export default class Root extends PureComponent {
    static propTypes = {
        children: PropTypes.node,
        navigator: PropTypes.object,
        currentChannelId: PropTypes.string,
        locale: PropTypes.string.isRequired
    };

    componentWillMount() {
        EventEmitter.on(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
    }

    componentWillUnmount() {
        EventEmitter.off(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
    }

    handleInAppNotification = (notification) => {
        const {data} = notification;
        const {currentChannelId, navigator} = this.props;

        if (data.channel_id !== currentChannelId) {
            navigator.showInAppNotification({
                screen: 'Notification',
                position: 'top',
                autoDismissTimerSec: 15,
                dismissWithSwipe: true,
                passProps: {
                    notification
                }
            });
        }
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
