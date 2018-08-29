// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {Preferences} from 'mattermost-redux/constants';
import {getEmailInterval} from 'mattermost-redux/utils/notify_props';

import {getNotificationProps} from 'app/utils/notify_props';
import {setNavigatorStyles} from 'app/utils/theme';

export default class NotificationSettingsEmailBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            savePreferences: PropTypes.func.isRequired,
            updateMe: PropTypes.func.isRequired,
        }),
        currentUser: PropTypes.object.isRequired,
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

        const interval = this.computeEmailInterval(sendEmailNotifications, enableEmailBatching, emailInterval);

        this.state = {
            interval,
            newInterval: interval,
            showEmailNotificationsModal: false,
        };

        navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        const {
            sendEmailNotifications,
            enableEmailBatching,
            emailInterval,
        } = nextProps;

        if (
            this.props.sendEmailNotifications !== sendEmailNotifications ||
            this.props.enableEmailBatching !== enableEmailBatching ||
            this.props.emailInterval !== emailInterval
        ) {
            const interval = this.computeEmailInterval(sendEmailNotifications, enableEmailBatching, emailInterval);
            this.setState({
                interval,
                newInterval: interval,
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

    setEmailNotifications = (value) => {
        const {sendEmailNotifications} = this.props;

        let email = 'false';
        if (sendEmailNotifications && value !== Preferences.INTERVAL_NEVER.toString()) {
            email = 'true';
        }

        this.setState({
            email,
            interval: value,
            newInterval: value,
        });
    };

    saveEmailNotifyProps = () => {
        const {actions, currentUser} = this.props;
        const {email, newInterval} = this.state;

        const notifyProps = getNotificationProps(currentUser);
        actions.updateMe({notify_props: {...notifyProps, email}});

        const emailInterval = {category: Preferences.CATEGORY_NOTIFICATIONS, user_id: currentUser.id, name: Preferences.EMAIL_INTERVAL, value: newInterval};
        actions.savePreferences(currentUser.id, [emailInterval]);
    };

    computeEmailInterval = (sendEmailNotifications, enableEmailBatching, emailInterval) => {
        return getEmailInterval(
            sendEmailNotifications,
            enableEmailBatching,
            parseInt(emailInterval, 10),
        ).toString();
    }
}
