// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Alert, Platform} from 'react-native';

import {handleLoginIdChanged} from 'app/actions/views/login';
import {handleServerUrlChanged} from 'app/actions/views/select_server';
import {getTranslations} from 'app/i18n';
import mattermostBucket from 'app/mattermost_bucket';
import mattermostManaged from 'app/mattermost_managed';
import {getCurrentLocale} from 'app/selectors/i18n';

import LocalConfig from 'assets/config';

import telemetry from '../../telemetry';

export default class Emm {
    constructor(store, start) {
        const locale = getCurrentLocale(store.getState());

        this.store = store;
        this.startFakeApp = start;
        this.emmEnabled = false;
        this.allowOtherServers = true;
        this.messages = getTranslations(locale);

        mattermostManaged.addEventListener('managedConfigDidChange', this.handleManagedConfig);
    }

    authenticateIfEnabled = async () => {
        const config = await mattermostManaged.getConfig();
        const authNeeded = config.inAppPinCode && config.inAppPinCode === 'true';

        if (authNeeded) {
            this.handleAuthentication(config.vendor);
        }
    };

    getAllowOtherServers = () => {
        return this.allowOtherServers;
    };

    handleAuthentication = async (vendor) => {
        telemetry.captureStart('emmAuthentication');
        const isSecured = await mattermostManaged.isDeviceSecure();

        if (isSecured) {
            try {
                mattermostBucket.setPreference('emm', vendor, LocalConfig.AppGroupId);
                await mattermostManaged.authenticate({
                    reason: this.messages['mobile.managed.secured_by'].replace('{vendor}', vendor),
                    fallbackToPasscode: true,
                    suppressEnterPassword: true,
                });
            } catch (err) {
                mattermostManaged.quitApp();
                return false;
            }
        }
        telemetry.captureEnd('emmAuthentication');
        return true;
    };

    handleManagedConfig = async (serverConfig) => {
        const {dispatch, getState} = this.store;
        const state = getState();

        let authNeeded = false;
        let blurApplicationScreen = false;
        let jailbreakProtection = false;
        let vendor = null;
        let serverUrl = null;
        let username = null;

        if (LocalConfig.AutoSelectServerUrl) {
            dispatch(handleServerUrlChanged(LocalConfig.DefaultServerUrl));
            this.allowOtherServers = false;
        }

        try {
            const config = await mattermostManaged.getConfig();
            if (config && Object.keys(config).length) {
                this.emmEnabled = true;
                authNeeded = config.inAppPinCode && config.inAppPinCode === 'true';
                blurApplicationScreen = config.blurApplicationScreen && config.blurApplicationScreen === 'true';
                jailbreakProtection = config.jailbreakProtection && config.jailbreakProtection === 'true';
                vendor = config.vendor || 'Mattermost';

                if (!state.entities.general.credentials.token) {
                    serverUrl = config.serverUrl;
                    username = config.username;

                    if (config.allowOtherServers && config.allowOtherServers === 'false') {
                        this.allowOtherServers = false;
                    }
                }

                if (jailbreakProtection) {
                    const isTrusted = mattermostManaged.isTrustedDevice();

                    if (!isTrusted) {
                        Alert.alert(
                            this.messages['mobile.managed.blocked_by'].replace('{vendor}', vendor),
                            this.messages['mobile.managed.jailbreak'].replace('{vendor}', vendor),
                            [{
                                text: this.messages['mobile.managed.exit'],
                                style: 'destructive',
                                onPress: () => {
                                    mattermostManaged.quitApp();
                                },
                            }],
                            {cancelable: false}
                        );
                        return false;
                    }
                }

                if (authNeeded && !serverConfig) {
                    if (Platform.OS === 'android') {
                        //Start a fake app as we need at least one activity for android
                        await this.startFakeApp();
                    }

                    const authenticated = await this.handleAuthentication(vendor);
                    if (!authenticated) {
                        return false;
                    }
                }

                if (blurApplicationScreen) {
                    mattermostManaged.blurAppScreen(true);
                }

                if (serverUrl) {
                    dispatch(handleServerUrlChanged(serverUrl));
                }

                if (username) {
                    dispatch(handleLoginIdChanged(username));
                }
            }
        } catch (error) {
            return true;
        }

        return true;
    };

    isEnabled = () => {
        return this.emmEnabled;
    };
}
