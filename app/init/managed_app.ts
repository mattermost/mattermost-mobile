// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm, {AuthenticationOutcome} from '@mattermost/react-native-emm';
import deepEqual from 'deep-equal';
import {isRootedExperimentalAsync} from 'expo-device';
import {defineMessages} from 'react-intl';
import {Alert, AppState, type AppStateStatus, type EventSubscription, type NativeEventSubscription, Platform} from 'react-native';

import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {showAuthenticationInterruptedAlert, showNotSecuredAlert} from '@utils/alerts';
import {getFullErrorMessage} from '@utils/errors';
import {isMainActivity} from '@utils/helpers';
import {logDebug} from '@utils/log';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {handleAppStateResume} from '@utils/security/app_state';
import {getAuthenticationOutcome, probeDeviceSecured} from '@utils/security/authentication';
import {AuthenticationSource} from '@utils/security/constants';

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
    private emmListener: EventSubscription | undefined;
    private appStateChangeListener: NativeEventSubscription | undefined;

    constructor() {
        this.emmListener = Emm.addListener((cfg: ManagedConfig) => {
            if (!deepEqual(cfg, this.cacheConfig)) {
                this.processConfig(cfg);
                this.cacheConfig = cfg;
            }
        });

        this.setIOSAppGroupIdentifier();

        this.appStateChangeListener = AppState.addEventListener('change', this.onAppStateChange);
    }

    init() {
        logDebug('ManagedApp: Initializing');
        this.cacheConfig = Emm.getManagedConfig<ManagedConfig>();
        this.processConfig(this.cacheConfig);
    }

    cleanup() {
        this.emmListener?.remove();
        this.appStateChangeListener?.remove();
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

        try {
            return await this.runAuthenticationGate(authExpired);
        } catch (error) {
            // Nobody failed authentication here, so the app stays open; the finally below
            // keeps the flag from latching and blocking every future prompt.
            logDebug('ManagedApp: Authentication gate failed', {reason: getFullErrorMessage(error)});
            return false;
        } finally {
            this.performingAuthentication = false;
        }
    };

    /**
     * Unbounded: every iteration needs a Retry tap, and the alternative on a final attempt
     * would be closing the app on a user who never failed to authenticate.
     */
    private runAuthenticationGate = async (authExpired: boolean) => {
        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);

        /* eslint-disable no-await-in-loop */
        for (;;) {
            const secured = await probeDeviceSecured(AuthenticationSource.ManagedApp);

            if (secured === 'notSecured') {
                await showNotSecuredAlert('', this.vendor, locale, true);
                Emm.exitApp();
                return false;
            }

            if (secured === 'secured' && !authExpired) {
                return true;
            }

            if (secured === 'secured') {
                const outcome = await this.runAuthenticationAttempt(translations);

                if (outcome === 'success') {
                    this.backgroundSince = 0;
                    return true;
                }

                if (outcome === 'failed') {
                    Emm.exitApp();
                    return false;
                }
            }

            // Cancelled, interrupted, or the secured check could not be determined: nobody
            // failed, so offer a retry instead of closing the app.
            const choice = await showAuthenticationInterruptedAlert('', this.vendor, locale);
            if (choice !== 'retry') {
                return false;
            }
        }
    };

    private runAuthenticationAttempt = async (translations: Record<string, string>) => {
        try {
            await Emm.authenticate({
                reason: translations[messages.securedBy.id].replace('{vendor}', this.vendor),
                fallback: true,
                supressEnterPassword: true,
            });

            return 'success';
        } catch (error) {
            const outcome = getAuthenticationOutcome(error);
            logDebug('ManagedApp: Authentication attempt did not succeed', {outcome, reason: getFullErrorMessage(error)});

            return outcome === AuthenticationOutcome.Failed ? 'failed' : 'interrupted';
        }
    };

    onAppStateChange = async (appState: AppStateStatus) => {
        await handleAppStateResume(appState, this, {
            isEnabled: () => this.enabled && this.inAppPinCode && isMainActivity(),
            isGateOpen: () => this.performingAuthentication,
            authenticate: (authExpired) => this.handleDeviceAuthentication(authExpired),

            // The device-secured check still runs on every resume, even inside the window.
            promptWhenNotExpired: true,
            source: AuthenticationSource.ManagedApp,
        });
    };

}

const ManagedApp = new ManagedAppSingleton();
export default ManagedApp;
