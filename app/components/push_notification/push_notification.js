// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {Platform} from 'react-native';
import DeviceNotification from 'react-native-push-notification';
import {MessageBar, MessageBarManager} from 'react-native-message-bar';

import {changeOpacity} from 'app/utils/theme';
import icon from 'assets/images/icon.png';
import {GooglePlaySenderId} from 'assets/config.json';

import {Constants} from 'mattermost-redux/constants';

export default class PushNotification extends PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string,
        currentChannelId: PropTypes.string,
        teams: PropTypes.object,
        actions: PropTypes.shape({
            goToNotification: PropTypes.func.isRequired,
            queueNotification: PropTypes.func.isRequired,
            setDeviceToken: PropTypes.func.isRequired
        }).isRequired
    };

    static defaultProps: {
        teams: {}
    };

    constructor(props) {
        super(props);

        this.isConfigured = false;
    }

    componentDidMount() {
        MessageBarManager.registerMessageBar(this.refs.notification);
        this.configurePushNotifications();
    }

    componentWillUnmount() {
        MessageBarManager.unregisterMessageBar();
        DeviceNotification.unregister();
    }

    componentWillReceiveProps(props) {
        if (this.isConfigured) {
            DeviceNotification.setApplicationIconBadgeNumber(props.mentionCount || 0);
        }
    }

    configurePushNotifications = () => {
        DeviceNotification.configure({
            onRegister: this.onRegisterDevice,
            onNotification: this.onPushNotification,
            senderID: GooglePlaySenderId,
            popInitialNotification: true,
            requestPermissions: true
        });
    };

    onRegisterDevice = (data) => {
        const prefix = Platform.OS === 'ios' ? Constants.PUSH_NOTIFY_APPLE_REACT_NATIVE : Constants.PUSH_NOTIFY_ANDROID_REACT_NATIVE;
        this.props.actions.setDeviceToken(`${prefix}:${data.token}`);
        this.isConfigured = true;
    };

    onPushNotification = (deviceNotification) => {
        const {foreground, userInteraction, data, message} = deviceNotification;
        let notification;

        if (Platform.OS === 'android') {
            notification = {
                data: {
                    channel_id: deviceNotification.channel_id,
                    team_id: deviceNotification.team_id
                },
                message
            };
        } else {
            notification = {
                data,
                message
            };
        }

        if (foreground) {
            this.handleInAppNotification(notification);
        } else if (userInteraction) {
            this.onNotificationTapped(notification);
        }
    };

    onNotificationTapped = (notification) => {
        const {currentTeamId, currentChannelId, teams} = this.props;

        if (currentTeamId && currentChannelId && Object.keys(teams).length) {
            // this means that the store has the necessary data
            this.props.actions.goToNotification(notification);
        } else {
            this.props.actions.queueNotification(notification);
        }
    };

    handleInAppNotification = (notification) => {
        const {data, message} = notification;
        const {currentChannelId} = this.props;

        if (data.channel_id !== currentChannelId) {
            MessageBarManager.showAlert({
                alertType: 'info',
                avatar: icon,
                avatarStyle: {borderRadius: 10, width: 20, height: 20},
                message,
                stylesheetInfo: {backgroundColor: changeOpacity('#000', 0.9)},
                messageStyle: {color: 'white', fontSize: 13},
                viewTopInset: 15,
                viewBottomInset: 15,
                duration: 5000,
                onTapped: () => this.onNotificationTapped(notification)
            });
        }
    };

    render() {
        return (
            <MessageBar ref='notification'/>
        );
    }
}
