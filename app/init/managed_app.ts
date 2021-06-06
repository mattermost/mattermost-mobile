// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {Alert, AlertButton, AppState, AppStateStatus, Platform} from 'react-native';
import JailMonkey from 'jail-monkey';

import LocalConfig from '@assets/config.json';
import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

import type {ManagedConfig} from '@mattermost/react-native-emm';

import {getAppCredentials} from './credentials';

const PROMPT_IN_APP_PIN_CODE_AFTER = 5 * 1000;

class ManagedApp {
    allowOtherServers = true;
    appGroupIdentifier: string | undefined;
    backgroundSince = 0;
    blurApplicationScreen = false;
    config: ManagedConfig | undefined;
    enabled = false;
    inAppPinCode = false;
    jailbreakProtection = false;
    performingAuthentication = false;
    previousAppState: AppStateStatus | undefined;
    processConfigTimeout: NodeJS.Timeout | undefined;
    vendor = 'Mattermost';

    constructor() {
        this.setConfig();
        this.setIOSAppGroupIdentifier();

        Emm.addListener(this.onManagedConfigChange);
        AppState.addEventListener('change', this.onAppStateChange);
    }

    setConfig = async (config?: ManagedConfig) => {
        this.config = config || await Emm.getManagedConfig();
        this.enabled = Boolean(this.config && Object.keys(this.config).length);
    }

    setIOSAppGroupIdentifier = () => {
        if (Platform.OS === 'ios') {
            const {appGroupIdentifier} = getIOSAppGroupDetails();

            if (appGroupIdentifier) {
                this.appGroupIdentifier = appGroupIdentifier;
                Emm.setAppGroupId(appGroupIdentifier);
            }
        }
    }

    onManagedConfigChange = (config: ManagedConfig) => {
        this.setConfig(config)
        this.processConfig();
    }

    processConfig = async () => {
        if (!this.enabled) {
            return;
        }

        if (this.performingAuthentication) {
            if (this.processConfigTimeout) {
                clearTimeout(this.processConfigTimeout);
            }

            this.processConfigTimeout = setTimeout(this.processConfig, 500);
        }

        if (LocalConfig.AutoSelectServerUrl) {
            // TODO: Set server url based on EMM config
            this.allowOtherServers = false;
        }

        const blurScreen = this.config!.blurApplicationScreen === 'true';
        Emm.enableBlurScreen(blurScreen);

        const vendor = this.config!.vendor;
        if (vendor) {
            this.vendor = vendor;
        }

        const jailbreakProtection = this.config!.jailbreakProtection === 'true';
        if (jailbreakProtection) {
            this.alertIfDeviceIsUntrusted();
        }

        const inAppPinCode = this.config!.inAppPinCode === 'true';
        if (inAppPinCode) {
            this.handleAuthentication(); // TODO: Handle authentication
        }

        const credentials = await getAppCredentials();
        if (!credentials) {
            if (this.config!.serverUrl) {
                // TODO: Set server url based on EMM config
            }

            if (this.config!.allowOtherServers === 'false') {
                this.allowOtherServers = false;
            }
        }
    };

    alertIfDeviceIsUntrusted = () => {
        if (this.isTrustedDevice()) {
            return;
        }

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
    };


    handleAuthentication = async (authExpired = true) => {
        this.performingAuthentication = true;
        const isSecured = await Emm.isDeviceSecured();
        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);

        if (!isSecured) {
            await this.showNotSecuredAlert(translations);
            Emm.exitApp();
            return;
        }

        if (authExpired) {
            try {
                await Emm.authenticate({
                    reason: translations[t('mobile.managed.secured_by')].replace('{vendor}', this.vendor),
                    fallback: true,
                    supressEnterPassword: true,
                });
            } catch (err) {
                Emm.exitApp();
                return;
            }
        }

        this.performingAuthentication = false;
    };

    isTrustedDevice = () => {
        return __DEV__ || JailMonkey.trustFall();
    };

    onAppStateChange = async (appState: AppStateStatus) => {
        const isActive = appState === 'active';
        const isBackground = appState === 'background';

        if (isActive && this.previousAppState === 'background') {
            if (this.enabled && this.inAppPinCode) {
                let authExpired = this.backgroundSince > 0 && (Date.now() - this.backgroundSince) >= PROMPT_IN_APP_PIN_CODE_AFTER;
                await this.handleAuthentication(authExpired);
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

export default new ManagedApp();
