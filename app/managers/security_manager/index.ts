// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {isRootedExperimentalAsync} from 'expo-device';
import {createIntl, defineMessages} from 'react-intl';
import {Alert, type AlertButton, AppState, type AppStateStatus, Platform} from 'react-native';

import {switchToServer} from '@actions/app/server';
import {logout} from '@actions/remote/session';
import {Preferences} from '@constants';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import ManagedApp from '@init/managed_app';
import {toMilliseconds} from '@utils/datetime';
import {isMainActivity} from '@utils/helpers';
import {logError} from '@utils/log';

import type {AvailableScreens} from '@typings/screens/navigation';

type SecurityManagerServerConfig = {
    Biometrics?: boolean;
    JailbreakProtection?: boolean;
    PreventScreenCapture?: boolean;
    authenticated?: boolean;
    lastAccessed?: number;
    siteName?: string;
};

type SecurityManagerServersCollection = Record<string, SecurityManagerServerConfig>;

const messages = defineMessages({
    not_secured_vendor_ios: {
        id: 'mobile.managed.not_secured.ios.vendor',
        defaultMessage: 'This device must be secured with biometrics or passcode to use {vendor}.\n\nGo to Settings > Face ID & Passcode.',
    },
    not_secured_vendor_android: {
        id: 'mobile.managed.not_secured.android.vendor',
        defaultMessage: 'This device must be secured with a screen lock to use {vendor}.',
    },
    not_secured_ios: {
        id: 'mobile.managed.not_secured.ios',
        defaultMessage: 'This device must be secured with biometrics or passcode to use Mattermost.\n\nGo to Settings > Face ID & Passcode.',
    },
    not_secured_android: {
        id: 'mobile.managed.not_secured.android',
        defaultMessage: 'This device must be secured with a screen lock to use Mattermost.',
    },
    blocked_by: {
        id: 'mobile.managed.blocked_by',
        defaultMessage: 'Blocked by {vendor}',
    },
    androidSettings: {
        id: 'mobile.managed.settings',
        defaultMessage: 'Go to settings',
    },
    securedBy: {
        id: 'mobile.managed.secured_by',
        defaultMessage: 'Secured by {vendor}',
    },
    logout: {
        id: 'mobile.managed.logout',
        defaultMessage: 'Logout',
    },
    ok: {
        id: 'mobile.managed.OK',
        defaultMessage: 'OK',
    },
    switchServer: {
        id: 'mobile.managed.switch_server',
        defaultMessage: 'Switch server',
    },
    exit: {
        id: 'mobile.managed.exit',
        defaultMessage: 'Exit',
    },
    jailbreak: {
        id: 'mobile.managed.jailbreak',
        defaultMessage: 'Jailbroken or rooted devices are not trusted by {vendor}.',
    },
    biometric_failed: {
        id: 'mobile.managed.biometric_failed',
        defaultMessage: 'Biometric or Passcode authentication failed.',
    },
});

class SecurityManagerSingleton {
    activeServer?: string;
    serverConfig: SecurityManagerServersCollection = {};
    backgroundSince = 0;
    previousAppState?: AppStateStatus;
    initialized = false;

    constructor() {
        AppState.addEventListener('change', this.onAppStateChange);
    }

    /**
     * Initializes the class with existing servers on app launch.
     * Should be called when the app starts.
     */
    async init(servers: Record<string, SecurityClientConfig>, activeServer?: string) {
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
            this.setScreenCapturePolicy(activeServer);
            const isJailbroken = await this.isDeviceJailbroken(activeServer);
            if (!isJailbroken) {
                this.authenticateWithBiometricsIfNeeded(activeServer);
            }
        }
    }

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
     * Checks if EMM is already enabled and setup
     * to handle screenshot protection.
     */
    isScreenshotProtectionHandledByEmm = () => {
        return ManagedApp.enabled && ManagedApp.cacheConfig?.blurApplicationScreen === 'true';
    };

    /**
     * Get the configuration of a server to prevent screenshots.
     */
    isScreenCapturePrevented = (server: string) => {
        const config = this.getServerConfig(server);
        if (!config) {
            return false;
        }

        return config.PreventScreenCapture == null ? false : config.PreventScreenCapture;
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
        if (config?.JailbreakProtection || siteName) {
            const isRooted = await isRootedExperimentalAsync();
            if (isRooted) {
                this.showDeviceNotTrustedAlert(server, siteName, translations);
                return true;
            }
        }

        return false;
    };

    /**
     * Add the config for a server.
     */
    addServer = (server: string, config?: SecurityClientConfig, authenticated = false) => {
        const mobileConfig: SecurityManagerServerConfig = {
            siteName: config?.SiteName,
            Biometrics: config?.MobileEnableBiometrics === 'true',
            JailbreakProtection: config?.MobileJailbreakProtection === 'true',
            PreventScreenCapture: config?.MobilePreventScreenCapture === 'true',
            authenticated,
        };
        this.serverConfig[server] = mobileConfig;
    };

    /**
     * Removes a configured server, to be called on logout.
     */
    removeServer = async (server: string) => {
        delete this.serverConfig[server];
        if (server === this.activeServer) {
            this.initialized = false;
            this.activeServer = undefined;
        }
    };

    /**
     * Get the configuration of a server.
     */
    getServerConfig = (server: string): SecurityManagerServerConfig| undefined => {
        return this.serverConfig[server];
    };

    /**
     * Switches the active server.
     */
    setActiveServer = (server: string) => {
        if (this.activeServer === server) {
            // active server is not changing, so no need to do anything here
            return;
        }

        if (this.activeServer && this.serverConfig[this.activeServer]) {
            this.serverConfig[this.activeServer].lastAccessed = Date.now();
        }

        if (this.serverConfig[server]) {
            this.activeServer = server;
            this.serverConfig[server].lastAccessed = Date.now();
            this.setScreenCapturePolicy(server);
        }
    };

    /**
     * Gets the last accessed server.
     */
    getLastAccessedServer = (otherServers: string[]) => {
        const lastAccessed = otherServers.map((s) => this.serverConfig[s].lastAccessed).sort((a: number, b: number) => b - a)[0];
        return Object.keys(this.serverConfig).find((s) => this.serverConfig[s].lastAccessed === lastAccessed);
    };

    /**
     * Switches to the previous server.
     */
    goToPreviousServer = async (otherServers: string[]) => {
        // Switch to last accessed server
        const lastAccessedServer = this.getLastAccessedServer(otherServers);
        if (lastAccessedServer) {
            const theme = Preferences.THEMES.denim;
            const locale = DEFAULT_LOCALE;

            const intl = createIntl({
                locale,
                defaultLocale: DEFAULT_LOCALE,
                messages: getTranslations(locale),
            });
            await switchToServer(lastAccessedServer, theme, intl);
        }
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
            const lastAccessed = config?.lastAccessed ?? 0;
            const timeSinceLastAccessed = Date.now() - lastAccessed;
            if (timeSinceLastAccessed > toMilliseconds({minutes: 5}) || config.authenticated === false) {
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
        const shouldBlurOnAuthenticate = server === this.activeServer && this.isScreenCapturePrevented(server);
        try {
            const auth = await Emm.authenticate({
                reason: translations[messages.securedBy.id].replace('{vendor}', siteName || config?.siteName || 'Mattermost'),
                fallback: true,
                supressEnterPassword: true,
                blurOnAuthenticate: shouldBlurOnAuthenticate,
            });

            if (config) {
                config.authenticated = auth;
            }

            if (!auth) {
                throw new Error('Authorization cancelled');
            }
        } catch (err) {
            logError('Failed to authenticate with biometrics', err);
            this.showBiometricFailureAlert(server, shouldBlurOnAuthenticate, siteName, translations);
            return false;
        }

        return true;
    };

    /**
     * Sets the screen capture policy for the given server.
     */
    setScreenCapturePolicy = (server: string) => {
        if (this.isScreenshotProtectionHandledByEmm()) {
            return;
        }

        Emm.enableBlurScreen(this.isScreenCapturePrevented(server));
    };

    /**
     * Gets the shielded screen ID for the screen.
     */
    getShieldScreenId = (screen: AvailableScreens, force = false, skip = false) => {
        if ((this.activeServer && this.isScreenCapturePrevented(this.activeServer)) || force) {
            const name = `${screen}.screen`;
            return skip ? `${name}.skip.shielded` : `${name}.shielded`;
        }

        return `${screen}.screen`;
    };

    /**
     * Builds the alert options for the alert.
     */
    buildAlertOptions = async (server: string, translations: Record<string, string>, callback?: (value: boolean) => void) => {
        const buttons: AlertButton[] = [];
        const hasSessionToServer = await getServerCredentials(server);
        if (server && hasSessionToServer) {
            buttons.push({
                text: translations[messages.logout.id],
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
                    text: translations[messages.ok.id],
                    style: 'cancel',
                    onPress: () => {
                        callback?.(true);
                    },
                });
            } else {
                buttons.push({
                    text: translations[messages.switchServer.id],
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
                text: translations[messages.exit.id],
                style: 'destructive',
                onPress: () => {
                    Emm.exitApp();
                },
            });
        }

        return buttons;
    };

    showDeviceNotTrustedAlert = async (server: string, siteName: string | undefined, translations: Record<string, string>) => {
        const buttons = await this.buildAlertOptions(server, translations);
        const securedBy = siteName || this.getServerConfig(server)?.siteName || 'Mattermost';

        Alert.alert(
            translations[messages.blocked_by.id].replace('{vendor}', securedBy),
            translations[messages.jailbreak.id].
                replace('{vendor}', securedBy),
            buttons,
            {cancelable: false},
        );
    };

    /**
     * Shows an alert when the device does not have biometrics or passcode set.
     */
    showNotSecuredAlert = async (server: string, siteName: string | undefined, translations: Record<string, string>) => {
        const buttons: AlertButton[] = [];
        const config = this.serverConfig[server];
        const securedBy = siteName || config?.siteName || 'Mattermost';

        if (Platform.OS === 'android') {
            buttons.push({
                text: translations[messages.androidSettings.id],
                onPress: () => {
                    Emm.openSecuritySettings();
                },
            });
        }

        const alertButtons = await this.buildAlertOptions(server, translations);
        buttons.push(...alertButtons);

        let message;
        if (config?.siteName || siteName) {
            const key = Platform.select({ios: messages.not_secured_vendor_ios.id, default: messages.not_secured_vendor_android.id});
            message = translations[key].replace('{vendor}', securedBy);
        } else {
            const key = Platform.select({ios: messages.not_secured_ios.id, default: messages.not_secured_android.id});
            message = translations[key];
        }

        Alert.alert(
            translations[messages.blocked_by.id].replace('{vendor}', securedBy),
            message,
            buttons,
            {cancelable: false},
        );
    };

    /**
     * Shows an alert when biometric authentication fails.
     */
    showBiometricFailureAlert = async (server: string, blurOnAuthenticate: boolean, siteName: string | undefined, translations: Record<string, string>) => {
        const buttons = await this.buildAlertOptions(server, translations, () => {
            if (blurOnAuthenticate) {
                Emm.removeBlurEffect();
            }
        });
        const securedBy = siteName || this.getServerConfig(server)?.siteName || 'Mattermost';

        Alert.alert(
            translations[messages.blocked_by.id].replace('{vendor}', securedBy),
            translations[messages.biometric_failed.id],
            buttons,
            {cancelable: false},
        );
    };
}

const SecurityManager = new SecurityManagerSingleton();
export default SecurityManager;
