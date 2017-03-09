// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {AppState, Platform, View} from 'react-native';
import {IntlProvider} from 'react-intl';
import PushNotification from 'react-native-push-notification';
import {MessageBar, MessageBarManager} from 'react-native-message-bar';
import {Constants} from 'service/constants';
import {getTranslations} from 'service/i18n';
import EventEmitter from 'service/utils/event_emitter';

import icon from 'assets/images/icon.png';
import {GooglePlaySenderId} from 'assets/config.json';

export default class Root extends PureComponent {
    static propTypes = {
        children: PropTypes.node,
        currentTeamId: PropTypes.string,
        currentChannelId: PropTypes.string,
        locale: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            goToNotification: PropTypes.func.isRequired,
            loadConfigAndLicense: PropTypes.func.isRequired,
            queueNotification: PropTypes.func.isRequired,
            setAppState: PropTypes.func.isRequired,
            setDeviceToken: PropTypes.func.isRequired,
            flushToStorage: PropTypes.func.isRequired
        }).isRequired
    };

    constructor(props) {
        super(props);

        this.handleAppStateChange = this.handleAppStateChange.bind(this);

        this.props.actions.setAppState(AppState.currentState === 'active');
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);
        EventEmitter.on(Constants.CONFIG_CHANGED, this.handleConfigChanged);
        MessageBarManager.registerMessageBar(this.refs.notification);
        this.configurePushNotifications();
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.handleAppStateChange);
        EventEmitter.off(Constants.CONFIG_CHANGED, this.handleConfigChanged);
        MessageBarManager.unregisterMessageBar();
        PushNotification.unregister();
    }

    onRegisterDevice = (data) => {
        const prefix = Platform.OS === 'ios' ? Constants.PUSH_NOTIFY_APPLE_REACT_NATIVE : Constants.PUSH_NOTIFY_ANDROID_REACT_NATIVE;
        this.props.actions.setDeviceToken(`${prefix}:${data.token}`);
    };

    onPushNotification = (notification) => {
        const {foreground, userInteraction, data} = notification;
        let noty;

        if (Platform.OS === 'android') {
            noty = {
                data: {
                    channel_id: notification.channel_id,
                    team_id: notification.team_id
                }
            };
        } else {
            noty = {data};
        }

        if (foreground) {
            this.handleInAppNotification(noty);
        } else if (userInteraction) {
            this.onNotificationTapped(noty);
        }
    };

    onNotificationTapped = (notification) => {
        const {currentTeamId, currentChannelId} = this.props;

        if (currentTeamId && currentChannelId) {
            // this means that the store has the necessary data
            this.props.actions.goToNotification(notification);
        } else {
            this.props.actions.queueNotification(notification);
        }
    };

    handleAppStateChange(appState) {
        this.props.actions.setAppState(appState === 'active');

        if (appState === 'inactive') {
            this.props.actions.flushToStorage();
        }
    }

    handleConfigChanged = (serverVersion) => {
        this.props.actions.loadConfigAndLicense(serverVersion);
    };

    handleInAppNotification = (notification) => {
        const {message} = notification;

        MessageBarManager.showAlert({
            alertType: 'info',
            avatar: icon,
            avatarStyle: {borderRadius: 10, width: 20, height: 20},
            message,
            stylesheetInfo: {backgroundColor: '#9c9c9c'},
            messageStyle: {color: 'white', fontSize: 13},
            viewTopInset: 15,
            viewBottomInset: 15,
            duration: 5000,
            onTapped: this.onNotificationTapped.bind(this, notification)
        });
    };

    configurePushNotifications = () => {
        PushNotification.configure({
            onRegister: this.onRegisterDevice,
            onNotification: this.onPushNotification,
            senderID: GooglePlaySenderId,
            popInitialNotification: true,
            requestPermissions: true
        });
    };

    render() {
        const locale = this.props.locale;

        return (
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                <View style={{flex: 1}}>
                    {this.props.children}
                    <MessageBar ref='notification'/>
                </View>
            </IntlProvider>
        );
    }
}
