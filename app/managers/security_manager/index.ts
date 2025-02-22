// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {isRootedExperimentalAsync} from 'expo-device';
import {createIntl} from 'react-intl';
import {Alert, type AlertButton, AppState, type AppStateStatus, Platform} from 'react-native';

import {switchToServer} from '@actions/app/server';
import {logout} from '@actions/remote/session';
import {Preferences} from '@constants';
import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import ManagedApp from '@init/managed_app';
import {toMilliseconds} from '@utils/datetime';
import {isMainActivity} from '@utils/helpers';
import {logError} from '@utils/log';

type SecurityManagerServerConfig = {
    siteName?: string;
    Biometrics?: boolean;
    JailbreakProtection?: boolean;
    AllowScreenCapture?: boolean;
    lastAccessed?: number;
};

type SecurityManagerServersCollection = Record<string, SecurityManagerServerConfig>;

class SecurityManager {
    initialized: boolean = false;
    activeServer?: string;
    serverConfig: SecurityManagerServersCollection = {};
    backgroundSince = 0;
    previousAppState?: AppStateStatus;

    constructor() {
        AppState.addEventListener('change', this.onAppStateChange);
    }

    /**
     * Initializes the class with existing servers on app launch.
     * Should be called when the app starts.
     */
    async init(servers: Record<string, ClientConfig>, activeServer?: string) {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        const added = new Set<string>();
        for (const [server, config] of Object.entries(servers)) {
            if (!this.serverConfig[server]) {
                this.addServer(server, config);
                added.add(server);
            }
        }

        if (activeServer && (!added.has(activeServer) || !this.activeServer)) {
            this.activeServer = activeServer;
            const isJailbroken = await this.isDeviceJailbroken(activeServer);
            if (!isJailbroken) {
                this.authenticateWithBiometricsIfNeeded(activeServer);
            }
        }
    }

    /**
     * Checks if EMM is already enabled and setup
     * to handle biometric / passcode authentication.
     */
    isAuthenticationHandledByEmm = () => {
        return ManagedApp.enabled && ManagedApp.inAppPinCode;
    };

    /**
     * Checks if EMM is already enabled and setup
     * to handle jailbreak protection.
     */
    isJalbreakProtectionHandledByEmm = () => {
        return ManagedApp.enabled && ManagedApp.cacheConfig?.jailbreakProtection === 'true';
    };

    /**
     * Add the config for a server.
     */
    addServer = (server: string, config?: ClientConfig) => {
        const mobileConfig: SecurityManagerServerConfig = {
            siteName: config?.SiteName,
            Biometrics: config?.MobileEnableBiometrics === 'true',
            JailbreakProtection: config?.MobileJailbreakProtection === 'true',
            AllowScreenCapture: config ? config.MobileAllowScreenshots === 'true' : true,
        };
        this.serverConfig[server] = mobileConfig;
    };

    /**
     * Removes a configured server, to be called on logout.
     */
    removeServer = (server: string) => {
        delete this.serverConfig[server];
    };

    /**
     * Get the configuration of a server.
     */
    getServerConfig = (server: string) => {
        return this.serverConfig[server];
    };

    /**
     * Switches the active server.
     */
    setActiveServer = (server: string) => {
        if (this.activeServer && this.serverConfig[this.activeServer]) {
            this.serverConfig[this.activeServer].lastAccessed = Date.now();
        }

        if (this.serverConfig[server]) {
            this.activeServer = server;
            this.serverConfig[server].lastAccessed = Date.now();
        }
    };

    /**
     * Checks if the device is Jailbroken or Rooted.
     */
    isDeviceJailbroken = async (server: string, siteName?: string) => {
        if (this.isJalbreakProtectionHandledByEmm()) {
            return false;
        }

        const config = this.getServerConfig(server);
        if (!config && !siteName) {
            return false;
        }

        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);

        if (!this.isJalbreakProtectionHandledByEmm() && (config?.JailbreakProtection || siteName)) {
            const isRooted = await isRootedExperimentalAsync();
            if (isRooted) {
                this.showDeviceNotTrustedAlert(server, siteName, translations);
                return true;
            }
        }

        return false;
    };

    /**
     * Determines if biometric authentication should be prompted.
     */
    authenticateWithBiometricsIfNeeded = async (server: string) => {
        if (this.isAuthenticationHandledByEmm()) {
            return true;
        }

        const config = this.getServerConfig(server);
        if (!config) {
            return true;
        }

        if (config?.Biometrics) {
            const lastAccessed = config?.lastAccessed || 0;
            const timeSinceLastAccessed = Date.now() - lastAccessed;
            if (timeSinceLastAccessed > toMilliseconds({minutes: 5})) {
                return this.authenticateWithBiometrics(server);
            }
        }

        return true;
    };

    /**
     * Handles biometric authentication.
     */
    authenticateWithBiometrics = async (server: string, siteName?: string) => {
        if (this.isAuthenticationHandledByEmm()) {
            return true;
        }

        const config = this.getServerConfig(server);
        if (!config && !siteName) {
            return true;
        }

        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);

        const isSecured = await Emm.isDeviceSecured();
        if (!isSecured) {
            await this.showNotSecuredAlert(server, siteName, translations);
            return false;
        }

        try {
            const auth = await Emm.authenticate({
                reason: translations[t('mobile.managed.secured_by')].replace('{vendor}', siteName || config?.siteName || 'Mattermost'),
                fallback: true,
                supressEnterPassword: true,
            });

            if (!auth) {
                throw new Error('Authorization cancelled');
            }
        } catch (err) {
            logError('Failed to authenticate with biometrics', err);
            this.showBiometricFailureAlert(server, siteName, translations);
            return false;
        }

        return true;
    };

    /**
     * Handles app state changes to prompt authentication when resuming from background.
     */
    onAppStateChange = async (appState: AppStateStatus) => {
        if (this.isAuthenticationHandledByEmm()) {
            return;
        }

        const isActive = appState === 'active';
        const isBackground = appState === 'background';

        if (isActive && this.previousAppState === 'background') {
            if (this.activeServer) {
                const config = this.getServerConfig(this.activeServer);
                if (config && config.Biometrics && isMainActivity()) {
                    const authExpired = this.backgroundSince > 0 && (Date.now() - this.backgroundSince) >= toMilliseconds({minutes: 5});
                    if (authExpired) {
                        const isJailbroken = await this.isDeviceJailbroken(this.activeServer);
                        if (!isJailbroken) {
                            await this.authenticateWithBiometrics(this.activeServer);
                        }
                    }
                    this.backgroundSince = 0;
                }
            }
        } else if (isBackground) {
            this.backgroundSince = Date.now();
        }

        this.previousAppState = appState;
    };

    showDeviceNotTrustedAlert = async (server: string, siteName: string | undefined, translations: Record<string, string>) => {
        const buttons = await this.buildAlertOptions(server, translations);
        const securedBy = siteName || this.getServerConfig(server)?.siteName || 'Mattermost';

        Alert.alert(
            translations[t('mobile.managed.blocked_by')].replace('{vendor}', securedBy),
            translations[t('mobile.managed.jailbreak')].
                replace('{vendor}', securedBy),
            buttons,
            {cancelable: false},
        );
    };

    /**
     * Shows an alert when the device does not have biometrics or passcode set.
     */
    showNotSecuredAlert = (server: string, siteName: string | undefined, translations: Record<string, string>) => {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            const buttons: AlertButton[] = [];
            const config = this.serverConfig[server];
            const securedBy = siteName || config?.siteName || 'Mattermost';

            if (Platform.OS === 'android') {
                buttons.push({
                    text: translations[t('mobile.managed.settings')],
                    onPress: () => {
                        Emm.openSecuritySettings();
                        resolve(true);
                    },
                });
            }

            const alertButtons = await this.buildAlertOptions(server, translations, resolve);
            buttons.push(...alertButtons);

            let message;
            const platform = Platform.select({ios: 'ios', default: 'android'});
            if (config?.siteName || siteName) {
                message = translations[t(`mobile.managed.not_secured.${platform}.vendor`)].replace('{vendor}', securedBy);
            } else {
                message = translations[t(`mobile.managed.not_secured.${platform}`)];
            }

            Alert.alert(
                translations[t('mobile.managed.blocked_by')].replace('{vendor}', securedBy),
                message,
                buttons,
                {cancelable: false},
            );
        });
    };

    /**
     * Shows an alert when biometric authentication fails.
     */
    showBiometricFailureAlert = async (server: string, siteName: string | undefined, translations: Record<string, string>) => {
        const buttons = await this.buildAlertOptions(server, translations);
        const securedBy = siteName || this.getServerConfig(server)?.siteName || 'Mattermost';

        Alert.alert(
            translations[t('mobile.managed.blocked_by')].replace('{vendor}', securedBy),
            translations[t('mobile.managed.biometric_failed')],
            buttons,
            {cancelable: false},
        );
    };

    /**
     * Switches to the previous server.
     */
    goToPreviousServer = async (otherServers: string[]) => {
        // Switch to last accessed server
        const lastAccessed = otherServers.map((s) => this.serverConfig[s].lastAccessed).sort().reverse()[0];
        const lastAccessedServer = Object.keys(this.serverConfig).find((s) => this.serverConfig[s].lastAccessed === lastAccessed);
        if (lastAccessedServer) {
            const theme = Preferences.THEMES.denim;
            const locale = DEFAULT_LOCALE;

            const intl = createIntl({
                locale,
                defaultLocale: DEFAULT_LOCALE,
                messages: getTranslations(locale),
            });
            switchToServer(lastAccessedServer, theme, intl);
        }
    };

    /**
     * Builds the alert options for the alert.
     */
    buildAlertOptions = async (server: string, translations: Record<string, string>, callback?: (value: boolean) => void) => {
        const buttons: AlertButton[] = [];
        const hasSessionToServer = await getServerCredentials(server);
        if (server && hasSessionToServer) {
            buttons.push({
                text: translations[t('mobile.managed.logout')],
                style: 'destructive',
                onPress: async () => {
                    await logout(server, undefined);
                    callback?.(true);
                },
            });
        }

        const otherServers = Object.keys(this.serverConfig).filter((s) => s !== server);
        if (otherServers.length > 0) {
            if (otherServers.length === 1 && otherServers[0] === this.activeServer) {
                buttons.push({
                    text: translations[t('mobile.managed.OK')],
                    style: 'cancel',
                    onPress: () => {
                        callback?.(true);
                    },
                });
            } else {
                buttons.push({
                    text: translations[t('mobile.managed.switch_server')],
                    style: 'cancel',
                    onPress: () => {
                        this.goToPreviousServer(otherServers);
                        callback?.(true);
                    },
                });
            }
        }

        if (buttons.length === 0) {
            buttons.push({
                text: translations[t('mobile.managed.exit')],
                style: 'destructive',
                onPress: () => {
                    Emm.exitApp();
                },
            });
        }

        return buttons;
    };
}

export default new SecurityManager();
