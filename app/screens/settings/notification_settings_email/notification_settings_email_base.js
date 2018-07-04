// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {Preferences} from 'mattermost-redux/constants';
import {getEmailInterval} from 'mattermost-redux/utils/notify_props';

import {setNavigatorStyles} from 'app/utils/theme';

export default class NotificationSettingsEmailBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            savePreferences: PropTypes.func.isRequired,
        }),
        currentUserId: PropTypes.string.isRequired,
        emailInterval: PropTypes.string.isRequired,
        enableEmailBatching: PropTypes.bool.isRequired,
        navigator: PropTypes.object,
        sendEmailNotifications: PropTypes.bool.isRequired,
        siteName: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        const {
            emailInterval,
            enableEmailBatching,
            navigator,
            sendEmailNotifications,
        } = props;

        this.state = {
            interval: getEmailInterval(
                sendEmailNotifications,
                enableEmailBatching,
                parseInt(emailInterval, 10),
            ).toString(),
            showEmailNotificationsModal: false,
        };

        navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        if (
            this.props.sendEmailNotifications !== nextProps.sendEmailNotifications ||
            this.props.enableEmailBatching !== nextProps.enableEmailBatching ||
            this.props.emailInterval !== nextProps.emailInterval
        ) {
            this.setState({
                interval: getEmailInterval(
                    nextProps.sendEmailNotifications,
                    nextProps.enableEmailBatching,
                    parseInt(nextProps.emailInterval, 10),
                ).toString(),
            });
        }
    }

    onNavigatorEvent = (event) => {
        if (event.type === 'ScreenChangedEvent') {
            switch (event.id) {
            case 'willDisappear':
                this.saveEmailNotifyProps();
                break;
            }
        }
    };

    setEmailNotifications = (interval) => {
        const {sendEmailNotifications} = this.props;

        let email = 'false';
        if (sendEmailNotifications && interval !== Preferences.INTERVAL_NEVER.toString()) {
            email = 'true';
        }

        this.setState({
            email,
            interval,
        });
    };

    saveEmailNotifyProps = () => {
        const {currentUserId} = this.props;
        const {email, interval} = this.state;
        const emailNotify = {category: Preferences.CATEGORY_NOTIFICATIONS, user_id: currentUserId, name: 'email', value: email};
        const emailInterval = {category: Preferences.CATEGORY_NOTIFICATIONS, user_id: currentUserId, name: Preferences.EMAIL_INTERVAL, value: interval};
        this.props.actions.savePreferences(currentUserId, [emailNotify, emailInterval]);
    };
}
