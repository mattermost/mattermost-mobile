// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PureComponent} from 'react';
import {Platform} from 'react-native';
import PropTypes from 'prop-types';
import {Navigation} from 'react-native-navigation';

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
        componentId: PropTypes.string,
        currentUser: PropTypes.object.isRequired,
        emailInterval: PropTypes.string.isRequired,
        enableEmailBatching: PropTypes.bool.isRequired,
        sendEmailNotifications: PropTypes.bool.isRequired,
        siteName: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        const {
            currentUser,
            emailInterval,
            enableEmailBatching,
            sendEmailNotifications,
        } = props;

        const notifyProps = getNotificationProps(currentUser);

        this.state = {
            emailInterval,
            newInterval: this.computeEmailInterval(notifyProps?.email === 'true' && sendEmailNotifications, enableEmailBatching, emailInterval),
            showEmailNotificationsModal: false,
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.componentId, nextProps.theme);
        }

        const {
            currentUser,
            sendEmailNotifications,
            enableEmailBatching,
            emailInterval,
        } = nextProps;

        if (
            this.props.sendEmailNotifications !== sendEmailNotifications ||
            this.props.enableEmailBatching !== enableEmailBatching ||
            this.props.emailInterval !== emailInterval
        ) {
            const notifyProps = getNotificationProps(currentUser);

            this.setState({
                emailInterval,
                newInterval: this.computeEmailInterval(notifyProps?.email === 'true' && sendEmailNotifications, enableEmailBatching, emailInterval),
            });
        }
    }

    componentDidDisappear() {
        if (Platform.OS === 'ios') {
            this.saveEmailNotifyProps();
        }
    }

    setEmailInterval = (value) => {
        this.setState({newInterval: value});
    };

    saveEmailNotifyProps = () => {
        const {emailInterval, newInterval} = this.state;

        if (emailInterval !== newInterval) {
            const {
                actions,
                currentUser,
                sendEmailNotifications,
            } = this.props;

            let email = 'false';
            if (sendEmailNotifications && newInterval !== Preferences.INTERVAL_NEVER.toString()) {
                email = 'true';
            }

            const notifyProps = getNotificationProps(currentUser);
            actions.updateMe({notify_props: {...notifyProps, email}});

            const emailIntervalPreference = {category: Preferences.CATEGORY_NOTIFICATIONS, user_id: currentUser.id, name: Preferences.EMAIL_INTERVAL, value: newInterval};
            actions.savePreferences(currentUser.id, [emailIntervalPreference]);
        }
    };

    computeEmailInterval = (sendEmailNotifications, enableEmailBatching, emailInterval) => {
        return getEmailInterval(
            sendEmailNotifications,
            enableEmailBatching,
            parseInt(emailInterval, 10),
        ).toString();
    }
}
