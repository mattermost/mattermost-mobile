// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {AppState, View} from 'react-native';
import {IntlProvider} from 'react-intl';
import DeviceInfo from 'react-native-device-info';

import PushNotification from 'app/components/push_notification';

import Client from 'service/client';
import {Constants} from 'service/constants';
import {getTranslations} from 'service/i18n';
import EventEmitter from 'service/utils/event_emitter';

export default class Root extends PureComponent {
    static propTypes = {
        children: PropTypes.node,
        currentTeamId: PropTypes.string,
        currentChannelId: PropTypes.string,
        locale: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            loadConfigAndLicense: PropTypes.func.isRequired,
            setAppState: PropTypes.func.isRequired,
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
        Client.setUserAgent(DeviceInfo.getUserAgent());
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.handleAppStateChange);
        EventEmitter.off(Constants.CONFIG_CHANGED, this.handleConfigChanged);
    }

    handleAppStateChange(appState) {
        this.props.actions.setAppState(appState === 'active');

        if (appState === 'inactive') {
            this.props.actions.flushToStorage();
        }
    }

    handleConfigChanged = (serverVersion) => {
        this.props.actions.loadConfigAndLicense(serverVersion);
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
                    <PushNotification/>
                </View>
            </IntlProvider>
        );
    }
}
