// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {
    Alert,
    AppState,
    AsyncStorage,
    BackAndroid,
    InteractionManager,
    Platform,
    StatusBar,
    View
} from 'react-native';
import {IntlProvider} from 'react-intl';
import DeviceInfo from 'react-native-device-info';
import SplashScreen from 'react-native-smart-splash-screen';
import semver from 'semver';

import PushNotification from 'app/components/push_notification';
import {SplashScreenTypes} from 'app/constants';
import {getTranslations} from 'app/i18n';

import Config from 'assets/config';

import Client from 'mattermost-redux/client';
import {Constants} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

export default class Root extends Component {
    static propTypes = {
        children: PropTypes.node,
        currentTeamId: PropTypes.string,
        currentChannelId: PropTypes.string,
        locale: PropTypes.string.isRequired,
        navigation: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            closeDrawers: PropTypes.func.isRequired,
            closeModal: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired,
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
        EventEmitter.on(SplashScreenTypes.CLOSE, this.handleCloseSplashScreen);
        Client.setUserAgent(DeviceInfo.getUserAgent());

        if (Platform.OS === 'android') {
            BackAndroid.addEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.handleAppStateChange);
        EventEmitter.off(Constants.CONFIG_CHANGED, this.handleConfigChanged);
        EventEmitter.off(SplashScreenTypes.CLOSE, this.handleCloseSplashScreen);

        if (Platform.OS === 'android') {
            BackAndroid.removeEventListener('hardwareBackPress', this.handleAndroidBack);
        }
    }

    handleAppStateChange(appState) {
        this.props.actions.setAppState(appState === 'active');

        if (appState === 'inactive') {
            this.props.actions.flushToStorage();
        }
    }

    handleAndroidBack = () => {
        const {index, isModal, leftDrawerOpen, modal} = this.props.navigation;
        const {closeDrawers, closeModal, goBack} = this.props.actions;

        if (isModal) {
            if (modal.index > 0) {
                goBack();
                return true;
            }
            closeModal();
            return true;
        }

        if (leftDrawerOpen) {
            closeDrawers();
            return true;
        } else if (index > 0) {
            goBack();
            return true;
        }

        return false;
    };

    handleCloseSplashScreen = (options = {}) => {
        const opts = {
            animationType: SplashScreen.animationType.scale,
            duration: 850,
            delay: 500
        };

        SplashScreen.close(Object.assign({}, opts, options));
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
