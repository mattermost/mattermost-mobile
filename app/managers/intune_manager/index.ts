// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {Platform, type EventSubscription} from 'react-native';

import {getCurrentUserLocale} from '@actions/local/user';
import {License} from '@constants';
import DatabaseManager from '@database/manager';
import {getConfig, getLicense} from '@queries/servers/system';
import {showBiometricFailureAlertForOrganization} from '@utils/alerts';
import {isMinimumLicenseTier} from '@utils/helpers';
import {logDebug, logError, logWarning} from '@utils/log';

import type {
    IntuneAuthRequiredEvent,
    IntuneConditionalLaunchBlockedEvent,
    IntuneEnrollmentChangedEvent,
    IntuneIdentitySwitchRequiredEvent,
    IntunePolicyChangedEvent,
    IntuneWipeRequestedEvent,
    MSALIdentity,
    MSALTokens,
    IntuneSpec,
    IntunePolicy,
} from './types';

let Intune: IntuneSpec | null = null;
if (Platform.OS === 'ios') {
    try {
        Intune = require('@mattermost/intune').default;
    } catch {
        // Intune library not available
        logWarning('Intune library not available - MAM features disabled');
    }
}

/**
 * IntuneManager - Thin wrapper for Microsoft Intune MAM integration
 *
 * Provides helper methods for enrollment, policy access, and identity management.
 * Event handling is delegated to SecurityManager via subscription methods.
 */
export class IntuneManagerSingleton {

    isIntuneEnabledForConfigAndLicense(config: ClientConfig, license?: ClientLicense): boolean {
        return Boolean(Intune) && isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced) &&
            config.IntuneMAMEnabled === 'true' && Boolean(config.IntuneScope) && Boolean(config.IntuneAuthService);
    }

    async isIntuneMAMEnabledForServer(serverUrl: string): Promise<boolean> {
        if (!Intune) {
            return false;
        }

        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const config = await getConfig(database);
            const license = await getLicense(database);
            return this.isIntuneEnabledForConfigAndLicense(config, license);
        } catch {
            return false;
        }
    }

    /**
     * Native OIDC login: acquire MSAL tokens with custom scopes
     * @param serverUrl - The Mattermost server URL (used to store scope)
     * @param scopes - Array of OAuth scopes (e.g., IntuneScope from server)
     * @returns MSALTokens containing idToken, accessToken, and identity
     */
    async login(serverUrl: string, scopes: string[]): Promise<MSALTokens> {
        if (!Intune) {
            throw new Error('IntuneManager: Intune library not available');
        }

        try {
            logDebug('IntuneManager: Starting native OIDC login');
            const tokens = await Intune.login(serverUrl, scopes);
            return tokens;
        } catch (error) {
            logError('IntuneManager: Native OIDC login failed', error);
            throw error;
        }
    }

    /**
     * Enroll a server in MAM
     * Automatically acquires MAM consent before enrolling to prevent duplicate prompts
     * @param serverUrl - The Mattermost server URL
     * @param identity - The MSAL identity (upn, tid, oid)
     */
    async enrollServer(serverUrl: string, identity: MSALIdentity): Promise<void> {
        if (!Intune) {
            return;
        }

        try {
            logDebug('IntuneManager: Enrolling in MAM');
            await Intune.enrollInMAM(serverUrl, identity);
        } catch (error) {
            logError('IntuneManager: MAM enrollment failed', error);
            throw error;
        }
    }

    /**
     * Unenroll a server from Intune MAM
     * @param serverUrl - The Mattermost server URL
     * @param doWipe - Whether to perform selective wipe
     */
    async unenrollServer(serverUrl: string, doWipe: boolean): Promise<void> {
        if (!Intune) {
            return;
        }

        try {
            const currentServer = await DatabaseManager.getActiveServerUrl();
            const isManaged = await Intune.isManagedServer(serverUrl);
            if (!isManaged) {
                logDebug('IntuneManager: Server not enrolled in MAM, skipping unenrollment');
                return;
            }
            logDebug('IntuneManager: Starting unenrollment', {doWipe});
            if (currentServer === serverUrl) {
                await Intune.setCurrentIdentity(null);
            }
            await Intune.deregisterAndUnenroll(serverUrl, doWipe);
        } catch (error) {
            logError('IntuneManager: Unenrollment failed', error);
        }
    }

    /**
     * Cleanup storage and MSAL account after selective wipe completes
     * This is called by SecurityManager after wipe operations complete successfully
     * to remove the OID-to-serverUrl mappings from keychain and delete the MSAL account.
     * @param oid - The Object ID (OID) to cleanup
     */
    async cleanupAfterWipe(oid: string): Promise<void> {
        if (!Intune) {
            return;
        }

        try {
            await Intune.cleanupAfterWipe(oid);
        } catch (error) {
            logError('IntuneManager: Cleanup after wipe failed', error);
        }
    }

    /**
     * Check if a server is managed by Intune
     * @param serverUrl - The Mattermost server URL
     * @returns true if server is Intune-managed
     */
    async isManagedServer(serverUrl: string): Promise<boolean> {
        if (!Intune) {
            return false;
        }

        try {
            return await Intune.isManagedServer(serverUrl);
        } catch (error) {
            logError('IntuneManager: Failed to check managed status', error);
            return false;
        }
    }

    /**
     * Set the current identity for Intune SDK context
     * @param serverUrl - The server URL to set as current, or null to clear
     */
    async setCurrentIdentity(serverUrl: string | null): Promise<void> {
        if (!Intune) {
            return;
        }

        try {
            if (serverUrl) {
                const isEnabled = await this.isIntuneMAMEnabledForServer(serverUrl);
                if (!isEnabled) {
                    logDebug('IntuneManager: Server is not licensed or configured, clearing current identity');
                    await Intune.setCurrentIdentity(null);
                    logDebug('IntuneManager: Current identity cleared');
                    return;
                }
            }

            await Intune.setCurrentIdentity(serverUrl);
            const identity = serverUrl ? 'set' : 'cleared';
            logDebug(`IntuneManager: Current identity ${identity}`);
        } catch (error) {
            logError('IntuneManager: Failed to set current identity', error);
            if (serverUrl) {
                await new Promise((resolve) => setTimeout(resolve, 250));
                Emm.enableBlurScreen(true);
                Emm.applyBlurEffect(20);
                const locale = await getCurrentUserLocale(serverUrl);
                await showBiometricFailureAlertForOrganization(serverUrl, locale, () => {
                    Emm.removeBlurEffect();
                    this.setCurrentIdentity(serverUrl);
                });
                Emm.enableBlurScreen(false);
            }
        }
    }

    /**
     * Get the Intune policy for a server
     * @param serverUrl - The Mattermost server URL
     * @returns IntunePolicy if server is managed, null otherwise
     */
    async getPolicy(serverUrl: string): Promise<IntunePolicy | null> {
        if (!Intune) {
            return null;
        }

        try {
            const isIntuneEnabled = await this.isIntuneMAMEnabledForServer(serverUrl);
            if (!isIntuneEnabled) {
                return null;
            }
            const isManaged = await Intune.isManagedServer(serverUrl);
            if (!isManaged) {
                return null;
            }

            return await Intune.getPolicy(serverUrl);
        } catch (error) {
            logError('IntuneManager: Failed to get policy', error);
            return null;
        }
    }

    /**
     * Subscribe to Intune policy change events
     * @param handler - The callback to handle policy changes
     * @returns EventSubscription that can be removed
     */
    subscribeToPolicyChanges(handler: (event: IntunePolicyChangedEvent) => void): EventSubscription | undefined {
        if (!Intune) {
            return undefined;
        }

        return Intune.onIntunePolicyChanged(handler);
    }

    /**
     * Subscribe to Intune enrollment change events
     * @param handler - The callback to handle enrollment changes
     * @returns EventSubscription that can be removed
     */
    subscribeToEnrollmentChanges(handler: (event: IntuneEnrollmentChangedEvent) => void): EventSubscription | undefined {
        if (!Intune) {
            return undefined;
        }

        return Intune.onIntuneEnrollmentChanged(handler);
    }

    /**
     * Subscribe to Intune wipe requested events
     * @param handler - The callback to handle wipe requests
     * @returns EventSubscription that can be removed
     */
    subscribeToWipeRequests(handler: (event: IntuneWipeRequestedEvent) => void): EventSubscription | undefined {
        if (!Intune) {
            return undefined;
        }

        return Intune.onIntuneWipeRequested(handler);
    }

    /**
     * Subscribe to Intune auth required events
     * @param handler - The callback to handle auth requirements
     * @returns EventSubscription that can be removed
     */
    subscribeToAuthRequired(handler: (event: IntuneAuthRequiredEvent) => void): EventSubscription | undefined {
        if (!Intune) {
            return undefined;
        }

        return Intune.onIntuneAuthRequired(handler);
    }

    /**
     * Subscribe to Intune conditional launch blocked events
     * @param handler - The callback to handle conditional launch blocks
     * @returns EventSubscription that can be removed
     */
    subscribeToConditionalLaunchBlocked(handler: (event: IntuneConditionalLaunchBlockedEvent) => void): EventSubscription | undefined {
        if (!Intune) {
            return undefined;
        }

        return Intune.onIntuneConditionalLaunchBlocked(handler);
    }

    /**
     * Subscribe to Intune identity switch required events
     * @param handler - The callback to handle identity switch requirements
     * @returns EventSubscription that can be removed
     */
    subscribeToIdentitySwitchRequired(handler: (event: IntuneIdentitySwitchRequiredEvent) => void): EventSubscription | undefined {
        if (!Intune) {
            return undefined;
        }

        return Intune.onIntuneIdentitySwitchRequired(handler);
    }

    /**
     * Report wipe completion status to native layer
     * Clears pending state if successful, retains for retry if failed
     * @param oid - The OID to report completion for
     * @param success - Whether the wipe was successful
     */
    async reportWipeComplete(oid: string, success: boolean): Promise<void> {
        if (!Intune) {
            return;
        }

        try {
            await Intune.reportWipeComplete(oid, success);
            logDebug(`IntuneManager: Wipe completion reported (success: ${success})`);
        } catch (error) {
            logError('IntuneManager: Failed to report wipe completion', error);
        }
    }

    /**
     * Get pending wipes that need to be retried
     * Filters out stale wipes (> 7 days old) automatically
     * @returns Array of pending wipes (empty array if none)
     */
    async getPendingWipes(): Promise<Array<{oid: string; serverUrls: string[]; timestamp: number}>> {
        if (!Intune) {
            return [];
        }

        try {
            const pendingWipes = await Intune.getPendingWipes();
            logDebug(`IntuneManager: Retrieved ${pendingWipes.length} pending wipe(s)`);
            return pendingWipes;
        } catch (error) {
            logError('IntuneManager: Failed to get pending wipes', error);
            return [];
        }
    }
}

const IntuneManager = new IntuneManagerSingleton();
export default IntuneManager;
