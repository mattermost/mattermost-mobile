// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {Alert, AppState, AsyncStorage, InteractionManager, StatusBar, View} from 'react-native';
import {IntlProvider} from 'react-intl';
import DeviceInfo from 'react-native-device-info';
import semver from 'semver';

import Config from 'assets/config';

import PushNotification from 'app/components/push_notification';
import {getTranslations} from 'app/i18n';

import Client from 'mattermost-redux/client';
import {Constants} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

export default class Root extends Component {
    static propTypes = {
        children: PropTypes.node,
        currentTeamId: PropTypes.string,
        currentChannelId: PropTypes.string,
        locale: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            closeDrawers: PropTypes.func.isRequired,
            loadConfigAndLicense: PropTypes.func.isRequired,
            logout: PropTypes.func.isRequired,
            setAppState: PropTypes.func.isRequired,
            flushToStorage: PropTypes.func.isRequired,
            unrenderDrawer: PropTypes.func.isRequired
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

    handleVersionUpgrade = async () => {
        const {closeDrawers, logout, unrenderDrawer} = this.props.actions;

        Client.serverVersion = '';

        const storage = await AsyncStorage.getItem('storage');
        if (storage) {
            setTimeout(async () => {
                const {token} = JSON.parse(await AsyncStorage.getItem('storage'));
                if (token) {
                    closeDrawers();
                    unrenderDrawer();
                    InteractionManager.runAfterInteractions(logout);
                }
            }, 1000);
        }
    };

    handleConfigChanged = (serverVersion) => {
        const {loadConfigAndLicense} = this.props.actions;
        const version = serverVersion.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g)[0];
        if (serverVersion) {
            if (semver.valid(version) && semver.lt(version, Config.MinServerVersion)) {
                Alert.alert(
                    'Server upgrade required',
                    'A server upgrade is required to use the Mattermost app. Please ask your System Administrator for details.',
                    [{
                        text: 'OK',
                        onPress: this.handleVersionUpgrade
                    }]
                );
            } else {
                loadConfigAndLicense(serverVersion);
            }
        }
    };

    render() {
        const locale = this.props.locale;

        return (
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                <View style={{flex: 1}}>
                    <StatusBar barStyle='light-content'/>
                    {this.props.children}
                    <PushNotification/>
                </View>
            </IntlProvider>
        );
    }
}
