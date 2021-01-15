// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {Alert, AlertButton, AppState, AppStateStatus, NativeModules, Platform} from 'react-native';
import JailMonkey from 'jail-monkey';

import LocalConfig from '@assets/config.json';
import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';

import {getAppCredentials} from './credentials';

const PROMPT_IN_APP_PIN_CODE_AFTER = 5 * 1000;

class EMMProvider {
    allowOtherServers = true;
    appGroupIdentifier: string | undefined;
    backgroundSince = 0;
    blurApplicationScreen = false;
    enabled = false;
    inAppPinCode = false;
    jailbreakProtection = false;
    performingAuthentication = false;
    previousAppState: AppStateStatus | undefined;
    vendor = 'Mattermost';

    constructor() {
        Emm.addListener(this.handleManagedConfig);
        AppState.addEventListener('change', this.onAppStateChange);

        if (Platform.OS === 'ios') {
            const {MattermostManaged} = NativeModules;
            if (MattermostManaged) {
                this.appGroupIdentifier = MattermostManaged.appGroupIdentifier;
            }

            if (this.appGroupIdentifier) {
                Emm.setAppGroupId(this.appGroupIdentifier);
            }
        }
    }

    checkIfDeviceIsTrusted = () => {
        const isTrusted = this.isTrustedDevice();

        if (!isTrusted) {
            const locale = DEFAULT_LOCALE; // TODO: Get current user or system locale
            const translations = getTranslations(locale);
            Alert.alert(
                translations[t('mobile.managed.blocked_by')].replace('{vendor}', this.vendor),
                translations[t('mobile.managed.jailbreak')].replace('{vendor}', this.vendor),
                [{
                    text: translations[t('mobile.managed.exit')],
                    style: 'destructive',
                    onPress: () => {
                        Emm.exitApp();
                    },
                }],
                {cancelable: false},
            );
        }
    };

    getAppGroupIdentifier = () => {
        return this.appGroupIdentifier;
    };

    handleAuthentication = async (prompt = true) => {
        this.performingAuthentication = true;
        const isSecured = await Emm.isDeviceSecured();
        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);

        if (isSecured) {
            try {
                if (prompt) {
                    await Emm.authenticate({
                        reason: translations[t('mobile.managed.secured_by')].replace('{vendor}', this.vendor),
                        fallback: true,
                        supressEnterPassword: true,
                    });
                }
            } catch (err) {
                Emm.exitApp();
                return false;
            }
        } else {
            await this.showNotSecuredAlert(translations);

            Emm.exitApp();
            return false;
        }

        this.performingAuthentication = false;
        return true;
    };

    handleManagedConfig = async () => {
        if (this.performingAuthentication) {
            return true;
        }

        if (LocalConfig.AutoSelectServerUrl) {
            // TODO: Set server url based on EMM config
            this.allowOtherServers = false;
        }

        const managedConfig = await Emm.getManagedConfig();

        if (managedConfig && Object.keys(managedConfig).length) {
            this.enabled = true;
            this.inAppPinCode = managedConfig.inAppPinCode === 'true';

            this.blurApplicationScreen = managedConfig.blurApplicationScreen === 'true';
            this.jailbreakProtection = managedConfig.jailbreakProtection === 'true';
            if (managedConfig.vendor) {
                this.vendor = managedConfig.vendor;
            }

            const credentials = await getAppCredentials();
            if (!credentials) {
                if (managedConfig.serverUrl) {
                    // TODO: Set server url based on EMM config
                }

                if (managedConfig.allowOtherServers && managedConfig.allowOtherServers === 'false') {
                    this.allowOtherServers = false;
                }
            }

            if (this.blurApplicationScreen) {
                Emm.enableBlurScreen(true);
            }
        }

        return true;
    };

    isTrustedDevice = () => {
        if (__DEV__) {
            return true;
        }

        return JailMonkey.trustFall();
    };

    onAppStateChange = async (appState: AppStateStatus) => {
        const isActive = appState === 'active';
        const isBackground = appState === 'background';

        if (isActive && (!this.enabled || this.previousAppState === 'background')) {
            // if the app is being controlled by an EMM provider
            if (this.enabled && this.inAppPinCode) {
                const authExpired = (Date.now() - this.backgroundSince) >= PROMPT_IN_APP_PIN_CODE_AFTER;

                // Once the app becomes active we check if the device needs to have a passcode set
                // if more than 5 minutes have passed prompt for passcode
                const prompt = this.backgroundSince > 0 && authExpired;
                await this.handleAuthentication(prompt);
            }

            this.backgroundSince = 0;
        } else if (isBackground) {
            this.backgroundSince = Date.now();
        }

        this.previousAppState = appState;
    };

    showNotSecuredAlert = (translations: Record<string, string>) => {
        return new Promise(async (resolve) => { /* eslint-disable-line no-async-promise-executor */
            const buttons: AlertButton[] = [];

            if (Platform.OS === 'android') {
                buttons.push({
                    text: translations[t('mobile.managed.settings')],
                    onPress: () => {
                        Emm.openSecuritySettings();
                    },
                });
            }

            buttons.push({
                text: translations[t('mobile.managed.exit')],
                onPress: resolve,
                style: 'cancel',
            });

            let message;
            if (Platform.OS === 'ios') {
                const {face} = await Emm.deviceSecureWith();

                if (face) {
                    message = translations[t('mobile.managed.not_secured.ios')];
                } else {
                    message = translations[t('mobile.managed.not_secured.ios.touchId')];
                }
            } else {
                message = translations[t('mobile.managed.not_secured.android')];
            }

            Alert.alert(
                translations[t('mobile.managed.blocked_by')].replace('{vendor}', this.vendor),
                message,
                buttons,
                {cancelable: false, onDismiss: () => resolve},
            );
        });
    };
}

export default new EMMProvider();
