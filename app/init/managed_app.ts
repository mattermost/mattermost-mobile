// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import deepEqual from 'deep-equal';
import {isRootedExperimentalAsync} from 'expo-device';
import {defineMessages} from 'react-intl';
import {Alert, type AlertButton, AppState, type AppStateStatus, Platform} from 'react-native';

import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {toMilliseconds} from '@utils/datetime';
import {isMainActivity} from '@utils/helpers';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

const PROMPT_IN_APP_PIN_CODE_AFTER = toMilliseconds({minutes: 5});

const messages = defineMessages({
    blocked: {
        id: 'mobile.managed.blocked_by',
        defaultMessage: 'Blocked by {vendor}',
    },
    jailbreak: {
        id: 'mobile.managed.jailbreak.emm',
        defaultMessage: 'Jailbroken or rooted devices are not trusted by {vendor}.\n\nThe app will now close.',
    },
    exit: {
        id: 'mobile.managed.exit',
        defaultMessage: 'Exit',
    },
    securedBy: {
        id: 'mobile.managed.secured_by',
        defaultMessage: 'Secured by {vendor}',
    },
    androidSettings: {
        id: 'mobile.managed.settings',
        defaultMessage: 'Go to settings',
    },
    notSecuredVendorIOS: {
        id: 'mobile.managed.not_secured.ios.vendor',
        defaultMessage: 'This device must be secured with biometrics or passcode to use {vendor}.\n\nGo to Settings > Face ID & Passcode.',
    },
    notSecuredVendorAndroid: {
        id: 'mobile.managed.not_secured.android.vendor',
        defaultMessage: 'This device must be secured with a screen lock to use {vendor}.',
    },
    notSecuredIOS: {
        id: 'mobile.managed.not_secured.ios',
        defaultMessage: 'This device must be secured with biometrics or passcode to use Mattermost.\n\nGo to Settings > Face ID & Passcode.',
    },
    notSecuredAndroid: {
        id: 'mobile.managed.not_secured.android',
        defaultMessage: 'This device must be secured with a screen lock to use Mattermost.',
    },
});

class ManagedAppSingleton {
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
        if (jailbreakProtection && (await isRootedExperimentalAsync())) {
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
            translations[messages.blocked.id].replace('{vendor}', this.vendor),
            translations[messages.jailbreak.id].
                replace('{vendor}', this.vendor),
            [{
                text: translations[messages.exit.id],
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
                    reason: translations[messages.securedBy.id].replace('{vendor}', this.vendor),
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
        return new Promise((resolve) => {
            const buttons: AlertButton[] = [];

            if (Platform.OS === 'android') {
                buttons.push({
                    text: translations[messages.androidSettings.id],
                    onPress: () => {
                        Emm.openSecuritySettings();
                    },
                });
            }

            buttons.push({
                text: translations[messages.exit.id],
                onPress: resolve,
                style: 'cancel',
            });

            let message;
            if (this.vendor) {
                const platform = Platform.select({ios: messages.notSecuredVendorIOS.id, default: messages.notSecuredVendorAndroid.id});
                message = translations[platform].replace('{vendor}', this.vendor);
            } else {
                const platform = Platform.select({ios: messages.notSecuredIOS.id, default: messages.notSecuredAndroid.id});
                message = translations[platform];
            }

            Alert.alert(
                translations[messages.blocked.id].replace('{vendor}', this.vendor),
                message,
                buttons,
                {cancelable: false, onDismiss: () => resolve},
            );
        });
    };
}

const ManagedApp = new ManagedAppSingleton();
export default ManagedApp;
