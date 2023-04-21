// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import deepEqual from 'deep-equal';
import JailMonkey from 'jail-monkey';
import {Alert, type AlertButton, AppState, type AppStateStatus, Platform} from 'react-native';

import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';
import {toMilliseconds} from '@utils/datetime';
import {isMainActivity} from '@utils/helpers';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

const PROMPT_IN_APP_PIN_CODE_AFTER = toMilliseconds({minutes: 5});

class ManagedApp {
    backgroundSince = 0;
    enabled = false;
    inAppPinCode = false;
    performingAuthentication = false;
    previousAppState?: AppStateStatus;
    processConfigTimeout?: NodeJS.Timeout;
    vendor = 'Mattermost';
    cacheConfig?: ManagedConfig = undefined;

    constructor() {
        Emm.addListener((cfg: ManagedConfig) => {
            if (!deepEqual(cfg, this.cacheConfig)) {
                this.processConfig(cfg);
                this.cacheConfig = cfg;
            }
        });

        this.setIOSAppGroupIdentifier();

        AppState.addEventListener('change', this.onAppStateChange);
    }

    init() {
        this.cacheConfig = Emm.getManagedConfig<ManagedConfig>();
        this.processConfig(this.cacheConfig);
    }

    setIOSAppGroupIdentifier = () => {
        if (Platform.OS === 'ios') {
            const {appGroupIdentifier} = getIOSAppGroupDetails();

            if (appGroupIdentifier) {
                Emm.setAppGroupId(appGroupIdentifier);
            }
        }
    };

    processConfig = async (config?: ManagedConfig) => {
        // If the managed configuration changed while authentication was
        // being performed, delay the processing of this new configuration
        // until authentication is complete.
        if (this.performingAuthentication) {
            if (this.processConfigTimeout) {
                clearTimeout(this.processConfigTimeout);
            }

            this.processConfigTimeout = setTimeout(() => this.processConfig(config), 500);
        }

        this.enabled = Boolean(config && Object.keys(config).length);
        if (!this.enabled) {
            return;
        }

        const blurScreen = config!.blurApplicationScreen === 'true';
        Emm.enableBlurScreen(blurScreen);

        const vendor = config!.vendor;
        if (vendor) {
            this.vendor = vendor;
        }

        const jailbreakProtection = config!.jailbreakProtection === 'true';
        if (jailbreakProtection && !this.isTrustedDevice()) {
            this.alertDeviceIsNotTrusted();
            return;
        }

        this.inAppPinCode = config!.inAppPinCode === 'true';
        if (this.inAppPinCode && !this.performingAuthentication) {
            await this.handleDeviceAuthentication();
        }
    };

    alertDeviceIsNotTrusted = () => {
        // We use the default device locale as this is an app wide setting
        // and does not require any server data
        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);
        Alert.alert(
            translations[t('mobile.managed.blocked_by')].replace('{vendor}', this.vendor),
            translations[t('mobile.managed.jailbreak')].
                replace('{vendor}', this.vendor).
                replace('{reason}', JailMonkey.jailBrokenMessage() || translations[t('mobile.managed.jailbreak_no_reason')]).
                replace('{debug}', JSON.stringify(JailMonkey.androidRootedDetectionMethods || translations[t('mobile.managed.jailbreak_no_debug_info')])),
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

    handleDeviceAuthentication = async (authExpired = true) => {
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
                const auth = await Emm.authenticate({
                    reason: translations[t('mobile.managed.secured_by')].replace('{vendor}', this.vendor),
                    fallback: true,
                    supressEnterPassword: true,
                });
                if (!auth) {
                    throw new Error('Authorization cancelled');
                }
            } catch (err) {
                Emm.exitApp();
                return;
            }
        }

        this.performingAuthentication = false;
    };

    isTrustedDevice = () => {
        return __DEV__ || !JailMonkey.isJailBroken();
    };

    onAppStateChange = async (appState: AppStateStatus) => {
        const isActive = appState === 'active';
        const isBackground = appState === 'background';

        if (isActive && this.previousAppState === 'background' && !this.performingAuthentication) {
            if (this.enabled && this.inAppPinCode && isMainActivity()) {
                const authExpired = this.backgroundSince > 0 && (Date.now() - this.backgroundSince) >= PROMPT_IN_APP_PIN_CODE_AFTER;
                await this.handleDeviceAuthentication(authExpired);
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
