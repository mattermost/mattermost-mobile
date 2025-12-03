// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import Emm from '@mattermost/react-native-emm';
import {isRootedExperimentalAsync} from 'expo-device';
import {AppState, DeviceEventEmitter, type AppStateStatus, type EventSubscription} from 'react-native';

import {terminateSession} from '@actions/local/session';
import {getCurrentUserLocale} from '@actions/local/user';
import {logout} from '@actions/remote/session';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import ManagedApp from '@init/managed_app';
import IntuneManager from '@managers/intune_manager';
import {
    IntuneConditionalLaunchBlockedReasons,
    type IntuneAuthRequiredEvent,
    type IntuneConditionalLaunchBlockedEvent,
    type IntuneEnrollmentChangedEvent,
    type IntuneIdentitySwitchRequiredEvent,
    type IntunePolicy,
    type IntunePolicyChangedEvent,
    type IntuneWipeRequestedEvent,
} from '@managers/intune_manager/types';
import {queryAllActiveServers} from '@queries/app/servers';
import {getConfig, getConfigValue, getSecurityConfig} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {
    messages,
    showAuthenticationRequiredAlert,
    showBiometricFailureAlert,
    showBiometricFailureAlertForOrganization,
    showConditionalAccessAlert,
    showDeviceNotTrustedAlert,
    showIdentitySwitchRequiredAlert,
    showMAMDeclinedAlert,
    showMAMEnrollmentFailedAlert,
    showMAMEnrollmentRequiredAlert,
    showNotSecuredAlert,
} from '@utils/alerts';
import {toMilliseconds} from '@utils/datetime';
import {isMainActivity} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

import type {AvailableScreens} from '@typings/screens/navigation';

type SecurityManagerServerConfig = {
    Biometrics?: boolean;
    JailbreakProtection?: boolean;
    PreventScreenCapture?: boolean;
    authenticated?: boolean;
    lastAccessed?: number;
    siteName?: string;
    intunePolicy?: IntunePolicy | null;
};

type SecurityManagerServersCollection = Record<string, SecurityManagerServerConfig>;

class SecurityManagerSingleton {
    activeServer?: string;
    serverConfig: SecurityManagerServersCollection = {};
    backgroundSince = 0;
    previousAppState?: AppStateStatus;
    initialized = false;
    started = false;
    isEnrolling = false;
    isCheckingBiometrics = false;
    needsEnrollmentCheck = false;
    intunePolicySubscription?: EventSubscription;
    intuneEnrollmentSubscription?: EventSubscription;
    intuneWipeSubscription?: EventSubscription;
    intuneAuthSubscription?: EventSubscription;
    intuneBlockedSubscription?: EventSubscription;
    intuneIdentitySwitchSubscription?: EventSubscription;

    constructor() {
        AppState.addEventListener('change', this.onAppStateChange);
        DeviceEventEmitter.addListener(Events.ACTIVE_SERVER_CHANGED, this.setActiveServer);
        DeviceEventEmitter.addListener(Events.LICENSE_CHANGED, this.onLicenseChanged);
        DeviceEventEmitter.addListener(Events.CONFIG_CHANGED, this.onConfigChanged);

        // Setup Intune event listeners
        this.intunePolicySubscription = IntuneManager.subscribeToPolicyChanges(this.onIntunePolicyChanged);
        this.intuneEnrollmentSubscription = IntuneManager.subscribeToEnrollmentChanges(this.onEnrollmentChanged);
        this.intuneWipeSubscription = IntuneManager.subscribeToWipeRequests(this.onWipeRequested);
        this.intuneAuthSubscription = IntuneManager.subscribeToAuthRequired(this.onAuthRequired);
        this.intuneBlockedSubscription = IntuneManager.subscribeToConditionalLaunchBlocked(this.onConditionalLaunchBlocked);
        this.intuneIdentitySwitchSubscription = IntuneManager.subscribeToIdentitySwitchRequired(this.onIdentitySwitchRequired);
    }

    /**
     * Initializes SecurityManager by loading server configs and Intune policies
     * Should be called during app startup in app/init/app.ts
     */
    async init() {
        if (this.initialized) {
            return;
        }

        logDebug('SecurityManager: Initializing');

        const loadServerConfig = async (serverUrl: string) => {
            try {
                // Get security config from server database
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const config = await getSecurityConfig(database);

                // Get Intune policy if available
                const intunePolicy = await IntuneManager.getPolicy(serverUrl);

                // Add server to config map
                this.addServer(serverUrl, config, false, intunePolicy);
            } catch (error) {
                logError('SecurityManager: Failed to load config for server', {error});
            }
        };

        try {
            // Query all active servers from app database
            const servers = await queryAllActiveServers()?.fetch();
            if (!servers || servers.length === 0) {
                logDebug('SecurityManager: No active servers found');
                this.initialized = true;
                return;
            }

            // Fetch configs and policies for all servers in parallel
            await Promise.all(servers.map((server) => loadServerConfig(server.url)));

            // Retry any pending wipes that failed previously
            await this.retryPendingWipes();
        } catch (error) {
            logError('SecurityManager: Failed to initialize', error);
        }

        this.initialized = true;
    }

    /**
     * Start method applies security policies to the active server
     * Should be called from Home screen after rendering
     */
    async start() {
        if (this.started) {
            return;
        }

        this.started = true;
        const serverUrl = await DatabaseManager.getActiveServerUrl();
        if (!serverUrl) {
            logDebug('SecurityManager: No active server to start');
            return;
        }

        // Delegate all logic to setActiveServer
        this.setActiveServer({serverUrl});
    }

    /**
     * Cleanup event listeners (for testing or shutdown)
     */
    cleanup() {
        logDebug('SecurityManager: Cleaning up');

        this.intunePolicySubscription?.remove();
        this.intuneEnrollmentSubscription?.remove();
        this.intuneWipeSubscription?.remove();
        this.intuneAuthSubscription?.remove();
        this.intuneBlockedSubscription?.remove();
        this.intuneIdentitySwitchSubscription?.remove();

        this.initialized = false;
        this.serverConfig = {};
        this.activeServer = undefined;
        this.started = false;
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
            if (this.activeServer && !this.serverConfig[this.activeServer].intunePolicy?.isPINRequired) {
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
     * Handles config changes from app
     */
    onConfigChanged = async (event: {serverUrl: string; config: SecurityClientConfig}) => {
        const {serverUrl, config} = event;
        logDebug('SecurityManager: Config changed');

        // Update server config
        const existingConfig = this.serverConfig[serverUrl] || {};
        const intunePolicy = await IntuneManager.getPolicy(serverUrl);

        this.serverConfig[serverUrl] = {
            ...existingConfig,
            siteName: config.SiteName,
            Biometrics: config.MobileEnableBiometrics === 'true',
            JailbreakProtection: config.MobileJailbreakProtection === 'true',
            PreventScreenCapture: config.MobilePreventScreenCapture === 'true',
            intunePolicy,
        };

        if (serverUrl === this.activeServer) {
            // If biometric auth is in progress, defer enrollment check
            if (this.isCheckingBiometrics) {
                logDebug('SecurityManager: Biometric auth in progress, deferring enrollment check');
                this.needsEnrollmentCheck = true;
                return;
            }

            // Check if MAM enrollment needed (method handles all checks internally)
            const enrollmentOk = await this.ensureMAMEnrollmentForActiveServer(serverUrl);

            // Only set screen capture policy if enrollment wasn't needed/succeeded
            if (enrollmentOk && !this.isEnrolling) {
                await IntuneManager.setCurrentIdentity(serverUrl);
                this.setScreenCapturePolicy(serverUrl);
            }
        }
    };

    onLicenseChanged = async (event: {serverUrl: string; license: ClientLicense}) => {
        const {serverUrl, license} = event;

        logDebug('SecurityManager: License changed', {isLicensed: license.IsLicensed, sku: license.SkuShortName});

        this.serverConfig[serverUrl] = this.serverConfig[serverUrl] || {};

        const intunePolicy = await IntuneManager.getPolicy(serverUrl);
        this.serverConfig[serverUrl].intunePolicy = intunePolicy;

        if (serverUrl === this.activeServer) {
            // Check if MAM enrollment needed (method handles all checks internally)
            const enrollmentOk = await this.ensureMAMEnrollmentForActiveServer(serverUrl);

            if (enrollmentOk && !this.isEnrolling) {
                await IntuneManager.setCurrentIdentity(serverUrl);
            }
        }
    };

    /**
     * Handles Intune policy changes from IntuneManager
     */
    onIntunePolicyChanged = (event: IntunePolicyChangedEvent) => {
        if (!this.initialized) {
            return;
        }

        const {changed, removed, policy, serverUrls} = event;

        // Update cached Intune policies for affected servers
        for (const serverUrl of serverUrls) {
            if (!this.serverConfig[serverUrl]) {
                this.serverConfig[serverUrl] = {};
            }

            if (removed) {
                this.serverConfig[serverUrl].intunePolicy = null;
            } else if (changed && policy) {
                this.serverConfig[serverUrl].intunePolicy = policy;
            }
        }

        // Only re-apply policies if the active server is affected
        if (this.activeServer && serverUrls.includes(this.activeServer)) {
            this.setScreenCapturePolicy(this.activeServer);
        }
    };

    /**
     * Handles enrollment status changes from Intune SDK
     */
    onEnrollmentChanged = (event: IntuneEnrollmentChangedEvent) => {
        const {enrolled, reason, serverUrls} = event;

        logDebug('SecurityManager: Enrollment changed', {enrolled, reason});

        if (enrolled) {
            // Successful enrollment
            this.handleEnrollmentSuccess(serverUrls);
        } else {
            // Unenrollment - remove intunePolicy from affected servers
            this.handleUnenrollment(serverUrls, reason);
        }
    };

    /**
     * Handles selective wipe requests from Intune SDK
     */
    onWipeRequested = async (event: IntuneWipeRequestedEvent) => {
        const {oid, serverUrls} = event;

        logDebug('SecurityManager: Wipe requested', {serverCount: serverUrls.length});

        let success = true;

        // Wipe non-active servers
        for await (const serverUrl of serverUrls) {
            if (serverUrl === this.activeServer) {
                // We do this one last to avoid issues with active server changes
                continue;
            }

            const wipeSuccess = await this.performSelectiveWipe(serverUrl, true);
            if (!wipeSuccess) {
                success = false;
            }
            this.removeServer(serverUrl);
        }

        // Finally wipe active server if needed
        if (this.activeServer && serverUrls.includes(this.activeServer)) {
            const wipeSuccess = await this.performSelectiveWipe(this.activeServer, false);
            if (!wipeSuccess) {
                success = false;
            }
            this.removeServer(this.activeServer);
        }

        // Cleanup storage and MSAL account after all wipes complete
        await IntuneManager.cleanupAfterWipe(oid);

        // Report completion status to native (clears pending state if successful)
        await IntuneManager.reportWipeComplete(oid, success);
    };

    /**
     * Handles authentication required events from Intune SDK
     */
    onAuthRequired = async (event: IntuneAuthRequiredEvent) => {
        const {oid, serverUrls, reason} = event;

        logDebug('SecurityManager: Auth required', {serverCount: serverUrls.length, reason});

        Emm.enableBlurScreen(true);
        Emm.applyBlurEffect(20);
        this.onWipeRequested({oid, serverUrls});

        const locale = await getCurrentUserLocale(serverUrls[0]);
        showAuthenticationRequiredAlert(reason, locale, () => {
            Emm.removeBlurEffect();
            Emm.enableBlurScreen(false);
        });
    };

    /**
     * Handles conditional launch blocked events from Intune SDK
     */
    onConditionalLaunchBlocked = async (event: IntuneConditionalLaunchBlockedEvent) => {
        const {oid, reason, serverUrls} = event;

        logDebug('SecurityManager: Conditional launch blocked', {reason, serverCount: serverUrls.length});

        if (reason === IntuneConditionalLaunchBlockedReasons.LAUNCH_BLOCKED) {
            // Conditional launch policy blocked (OS version, jailbreak, threat level)
            // Trigger selective wipe of managed data
            Emm.enableBlurScreen(true);
            Emm.applyBlurEffect(20);

            this.onWipeRequested({oid, serverUrls});
            const locale = await getCurrentUserLocale(serverUrls[0]);
            showConditionalAccessAlert(locale, () => {
                Emm.removeBlurEffect();
                Emm.enableBlurScreen(false);
            });
        } else if (reason === IntuneConditionalLaunchBlockedReasons.LAUNCH_CANCELED) {
            // User canceled conditional launch (dismissed PIN/auth prompt)
            // Allow retry with biometric prompt
            await new Promise((resolve) => setTimeout(resolve, 250));
            Emm.enableBlurScreen(true);
            Emm.applyBlurEffect(20);

            const locale = await getCurrentUserLocale(serverUrls[0]);

            await showBiometricFailureAlertForOrganization(serverUrls[0], locale, async () => {
                Emm.removeBlurEffect();

                // Retry by setting current identity again
                await IntuneManager.setCurrentIdentity(serverUrls[0]);
            });
            Emm.enableBlurScreen(false);
        }
    };

    /**
     * Handles identity switch required events from Intune SDK
     */
    onIdentitySwitchRequired = async (event: IntuneIdentitySwitchRequiredEvent) => {
        const {oid, reason, serverUrls} = event;

        logDebug('SecurityManager: Identity switch required', {reason, serverCount: serverUrls.length});
        const locale = await getCurrentUserLocale(serverUrls[0]);
        this.onWipeRequested({oid, serverUrls});

        showIdentitySwitchRequiredAlert(locale);
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
     * MAM policy takes precedence over server config.
     */
    isScreenCapturePrevented = (server: string) => {
        const config = this.getServerConfig(server);
        if (!config) {
            return false;
        }

        // Check Intune MAM policy first - MAM always wins
        if (config.intunePolicy?.isScreenCaptureAllowed === false) {
            // MAM explicitly disallows screen capture, so server policy doesn't apply
            return false;
        }

        // Fall back to server config if no MAM policy applies
        return config.PreventScreenCapture == null ? false : config.PreventScreenCapture;
    };

    /**
     * Checks if the device is Jailbroken or Rooted.
     * Skips check if MAM controls jailbreak detection.
     */
    isDeviceJailbroken = async (server: string, siteName?: string) => {
        if (this.isJalbreakProtectionHandledByEmm()) {
            return false;
        }

        const config = this.getServerConfig(server);
        if (!config && !siteName) {
            return false;
        }

        // Skip check if MAM policy is active - MAM handles jailbreak detection
        if (config?.intunePolicy != null) {
            return false;
        }

        // Fall back to server config if MAM doesn't control jailbreak detection
        if (config?.JailbreakProtection || siteName) {
            const isRooted = await isRootedExperimentalAsync();
            if (isRooted) {
                showDeviceNotTrustedAlert(server, siteName, DEFAULT_LOCALE);
                return true;
            }
        }

        return false;
    };

    /**
     * Add the config for a server.
     */
    addServer = async (server: string, config?: SecurityClientConfig, authenticated = false, intunePolicy: IntunePolicy | null = null) => {
        const mobileConfig: SecurityManagerServerConfig = {
            siteName: config?.SiteName,
            Biometrics: config?.MobileEnableBiometrics === 'true',
            JailbreakProtection: config?.MobileJailbreakProtection === 'true',
            PreventScreenCapture: config?.MobilePreventScreenCapture === 'true',
            authenticated,
            intunePolicy,
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
     * Ensures MAM enrollment for a server that requires it.
     * Shows alert with blur screen and performs enrollment via direct IntuneManager calls.
     *
     * @param serverUrl - Server URL to check and enroll
     * @returns Promise<boolean> - true if enrollment OK, false if failed/declined
     */
    async ensureMAMEnrollmentForActiveServer(serverUrl: string): Promise<boolean> {
        // Check if already enrolling to prevent race conditions
        if (this.isEnrolling) {
            logDebug('ensureMAMEnrollment: Already enrolling, skipping');
            return true;
        }

        // Check if Intune MAM is enabled
        const isIntuneEnabled = await IntuneManager.isIntuneMAMEnabledForServer(serverUrl);
        if (!isIntuneEnabled) {
            return true;
        }

        // Check if already enrolled
        const isManaged = await IntuneManager.isManagedServer(serverUrl);
        if (isManaged) {
            return true;
        }

        // Get server config and current user
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUser = await getCurrentUser(database);
        const authService = await getConfigValue(database, 'IntuneAuthService');

        // Check if current user is not using SSO entra login, skip enrollment
        if (currentUser && currentUser.authService.toLocaleLowerCase() !== authService?.toLocaleLowerCase()) {
            return true;
        }

        const config = await getConfig(database);
        const intuneScope = config.IntuneScope;

        if (!intuneScope) {
            logError('ensureMAMEnrollment: IntuneScope not configured');
            return false;
        }

        // Set enrolling flag and apply blur
        this.isEnrolling = true;

        // Get site name and locale for alerts
        const siteName = this.serverConfig[serverUrl]?.siteName;
        const locale = await getCurrentUserLocale(serverUrl);

        // Show alert and handle enrollment
        return new Promise(async (resolve) => {
            logDebug('ensureMAMEnrollment: Enrollment required', {serverUrl});

            Emm.enableBlurScreen(true);
            Emm.applyBlurEffect(20);

            // Give time for blur effect to apply
            await new Promise((resolveEffect) => setTimeout(resolveEffect, 250));

            const beforeExit = () => {
                // Always clear enrolling flag and remove blur
                this.isEnrolling = false;
                Emm.removeBlurEffect();
                this.setScreenCapturePolicy(serverUrl);
            };

            const handleEnrollment = async () => {
                try {
                    // Step 1: Acquire MSAL tokens via native login
                    const tokens = await IntuneManager.login(serverUrl, [intuneScope]);

                    // Step 2: Enroll in MAM (NO token sent to server - session exists)
                    // If enrollServer doesn't throw, consider it successful
                    // Policy and enrollment status will be updated via events
                    await IntuneManager.enrollServer(serverUrl, tokens.identity);

                    logDebug('ensureMAMEnrollment: Enrollment successful');

                    // Always clear enrolling flag and remove blur
                    beforeExit();
                    resolve(true);
                } catch (error) {
                    logError('ensureMAMEnrollment: Failed', error);

                    await showMAMEnrollmentFailedAlert(locale, () => {
                        // Always clear enrolling flag and remove blur
                        beforeExit();
                        logout(serverUrl, undefined, {removeServer: true});
                        resolve(false);
                    });
                }
            };

            const handleCancel = () => {
                logDebug('ensureMAMEnrollment: User declined enrollment');

                // Show declined alert with retry option
                showMAMDeclinedAlert(serverUrl, siteName, locale, () => {
                    beforeExit();
                    resolve(false);
                }, handleEnrollment);
            };

            // Show enrollment required alert
            showMAMEnrollmentRequiredAlert(siteName, locale, handleEnrollment, handleCancel);
        });
    }

    /**
     * Switches the active server and applies security policies.
     * Called via ACTIVE_SERVER_CHANGED event or directly.
     *
     * @param serverUrl - Server URL to activate
     * @param options - Optional skip flags for certain checks
     */
    setActiveServer = async ({serverUrl, options}: {serverUrl: string; options?: ActiveServerOptions}) => {
        const opts = options || {};

        // Set Intune identity
        await IntuneManager.setCurrentIdentity(serverUrl);
        if (this.activeServer === serverUrl && !opts.forceSwitch) {
            // active server is not changing, so no need to do anything here
            return;
        }

        // Update active server tracking
        if (this.activeServer && this.serverConfig[this.activeServer]) {
            this.serverConfig[this.activeServer].lastAccessed = Date.now();
        }

        if (!this.serverConfig[serverUrl]) {
            return;
        }

        this.activeServer = serverUrl;
        this.serverConfig[serverUrl].lastAccessed = Date.now();
        this.setScreenCapturePolicy(serverUrl);

        // Security checks (moved from start() method)
        // Order matters: MAM enrollment first, then jailbreak, then biometrics
        // This way we only check jailbreak/biometrics if user doesn't need to enroll

        // 1. Check MAM enrollment requirement (IMPORTANT: do not skip without explicit flag)
        if (!opts.skipMAMEnrollmentCheck) {
            const enrollmentOk = await this.ensureMAMEnrollmentForActiveServer(serverUrl);
            if (!enrollmentOk || this.isEnrolling) {
                return;
            }
        }

        // 2. Check jailbreak protection
        if (!opts.skipJailbreakCheck) {
            const isJailbroken = await this.isDeviceJailbroken(serverUrl);
            if (isJailbroken) {
                return;
            }
        }

        // 3. Check biometric authentication
        if (!opts.skipBiometricCheck) {
            await this.authenticateWithBiometricsIfNeeded(serverUrl);
        }
    };

    /**
     * Determines if biometric authentication should be prompted.
     * MAM policy takes precedence over server config.
     */
    authenticateWithBiometricsIfNeeded = async (server: string) => {
        if (this.isAuthenticationHandledByEmm()) {
            return true;
        }

        const config = this.getServerConfig(server);
        if (!config) {
            return true;
        }

        // Check Intune MAM policy first - if MAM requires PIN, skip server config
        if (config.intunePolicy?.isPINRequired === true) {
            return true;
        }

        // Fall back to server config if MAM doesn't require PIN
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
        // Prevent concurrent biometric checks
        if (this.isCheckingBiometrics) {
            logDebug('SecurityManager: Biometric check already in progress, skipping');
            return true;
        }

        this.isCheckingBiometrics = true;

        try {
            if (this.isAuthenticationHandledByEmm()) {
                return true;
            }

            const config = this.getServerConfig(server);
            if (!config && !siteName) {
                return true;
            }

            // Check Intune MAM policy first - if MAM requires PIN, skip server config
            if (config?.intunePolicy?.isPINRequired === true) {
                return true;
            }

            const locale = DEFAULT_LOCALE;
            const translations = getTranslations(locale);

            const isSecured = await Emm.isDeviceSecured();
            if (!isSecured) {
                await showNotSecuredAlert(server, siteName, locale);
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
                showBiometricFailureAlert(server, shouldBlurOnAuthenticate, siteName, locale);
                return false;
            }

            // After successful authentication, check if enrollment was deferred
            if (this.needsEnrollmentCheck) {
                this.needsEnrollmentCheck = false;
                logDebug('SecurityManager: Triggering deferred enrollment check');
                await this.ensureMAMEnrollmentForActiveServer(server);
            }

            return true;
        } finally {
            this.isCheckingBiometrics = false;
        }
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
     * Checks if saving to a location is allowed by Intune policy.
     */
    canSaveToLocation = (serverUrl: string, location: keyof IntunePolicy['allowedSaveLocations']) => {
        const policy = this.serverConfig[serverUrl]?.intunePolicy;
        if (!policy) {
            return true;
        }

        return policy.allowedSaveLocations[location];
    };

    // ============================================================================
    // Helper Methods for Intune Event Handling
    // ============================================================================

    /**
     * Handle successful enrollment
     */
    private handleEnrollmentSuccess = async (serverUrls: string[]) => {
        logDebug('SecurityManager: Handling enrollment success', {serverCount: serverUrls.length});

        // Fetch policy for first server (all servers for same identity share policy)
        const policy = await IntuneManager.getPolicy(serverUrls[0]);

        // Update policy for all affected servers
        for (const serverUrl of serverUrls) {
            if (!this.serverConfig[serverUrl]) {
                this.serverConfig[serverUrl] = {};
            }
            this.serverConfig[serverUrl].intunePolicy = policy;
        }

        // Set current identity if any affected server is active
        const currentServer = await DatabaseManager.getActiveServerUrl();
        if (currentServer && serverUrls.includes(currentServer)) {
            await IntuneManager.setCurrentIdentity(currentServer);
            this.setScreenCapturePolicy(currentServer);
        }
    };

    /**
     * Handle unenrollment - remove intunePolicy from affected servers
     */
    private handleUnenrollment = async (serverUrls: string[], reason?: string) => {
        logDebug('SecurityManager: Handling unenrollment', {serverCount: serverUrls.length, reason});

        // Remove intunePolicy from all affected servers
        for (const serverUrl of serverUrls) {
            if (this.serverConfig[serverUrl]) {
                this.serverConfig[serverUrl].intunePolicy = null;
            }
        }

        // Re-apply policies if the active server is affected
        const currentServer = await DatabaseManager.getActiveServerUrl();
        if (currentServer && serverUrls.includes(currentServer)) {
            this.setScreenCapturePolicy(currentServer);
        }
    };

    /**
     * Perform selective wipe for affected servers
     * @returns true if wipe succeeded, false if it failed
     */
    private performSelectiveWipe = async (serverUrl: string, skipEvents: boolean): Promise<boolean> => {
        // Try to logout from server (skip alert dialog for automated wipes)
        await logout(serverUrl, undefined, {skipServerLogout: false, skipEvents, skipAlert: true});

        // Always call terminateSession to clean up local data (even if server logout failed)
        if (skipEvents) {
            const result = await terminateSession(serverUrl, false);
            if (result.error) {
                logError('SecurityManager: terminateSession failed', {errors: result.error});
                return false;
            }
        }

        logDebug('SecurityManager: Server wiped successfully');
        return true;
    };

    /**
     * Retry any pending wipes that failed in a previous app session
     */
    private retryPendingWipes = async () => {
        const pendingWipes = await IntuneManager.getPendingWipes();
        if (pendingWipes.length === 0) {
            return;
        }

        logDebug('SecurityManager: Retrying pending wipes', {count: pendingWipes.length});

        pendingWipes.forEach(async (wipe) => {
            const {oid, serverUrls} = wipe;

            // Retry wipe for each server
            const results = await Promise.all(
                serverUrls.map((serverUrl) => this.performSelectiveWipe(serverUrl, true)),
            );

            // Check if all wipes succeeded
            const success = results.every((result) => result === true);

            // Report completion status (clears pending state if successful)
            await IntuneManager.reportWipeComplete(oid, success);
        });
    };
}

const SecurityManager = new SecurityManagerSingleton();
export default SecurityManager;
