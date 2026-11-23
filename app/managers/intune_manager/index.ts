// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {type EventSubscription} from 'react-native';

import {getCurrentUserLocale} from '@actions/local/user';
import {License} from '@constants';
import DatabaseManager from '@database/manager';
import {getConfig, getLicense} from '@queries/servers/system';
import {showBiometricFailureAlertForOrganization} from '@utils/alerts';
import {isMinimumLicenseTier} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

import type {
    IntuneAuthRequiredEvent,
    IntuneConditionalLaunchBlockedEvent,
    IntuneComplianceCompletedEvent,
    IntuneComplianceFailedEvent,
    IntuneEnrollmentChangedEvent,
    IntuneEnrollmentOutcome,
    IntuneIdentitySwitchRequiredEvent,
    IntunePolicyChangedEvent,
    IntuneWipeRequestedEvent,
    IntuneCompanyPortalRequiredEvent,
    MSALIdentity,
    MSALTokens,
    IntuneSpec,
    IntunePolicy,
} from './types';

const ENROLLMENT_OUTCOME_TIMEOUT_MS = 30000;

let Intune: IntuneSpec | null = null;
try {
    Intune = require('@mattermost/intune').default;
} catch {
    // Intune library not available
    logDebug('Intune library not available - MAM features disabled');
}

/**
 * IntuneManager - Thin wrapper for Microsoft Intune MAM integration
 *
 * Provides helper methods for enrollment, policy access, and identity management.
 * Event handling is delegated to SecurityManager via subscription methods.
 */
export class IntuneManagerSingleton {

    isIntuneEnabledForConfigAndLicense(config: Partial<ClientConfig>, license?: Partial<ClientLicense>): boolean {
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
    enrollServer(serverUrl: string, identity: MSALIdentity): void {
        if (!Intune) {
            return;
        }

        logDebug('IntuneManager: Enrolling in MAM');
        Intune.enrollInMAM(serverUrl, identity);
    }

    /**
     * Enroll a server in MAM and wait for the SDK outcome.
     * Enrollment that succeeds without a policy means the user is not targeted by any app protection policy.
     * @param serverUrl - The Mattermost server URL
     * @param identity - The MSAL identity (upn, tid, oid)
     * @param timeoutMs - How long to wait for an outcome before reporting 'timeout'
     */
    enrollAndWait(serverUrl: string, identity: MSALIdentity, timeoutMs = ENROLLMENT_OUTCOME_TIMEOUT_MS): Promise<IntuneEnrollmentOutcome> {
        const intune = Intune;
        if (!intune) {
            return Promise.resolve('timeout');
        }

        return new Promise((resolve) => {
            let settled = false;

            const finish = (outcome: IntuneEnrollmentOutcome) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                subscription.remove();
                resolve(outcome);
            };

            const hasPolicy = () => {
                try {
                    return Boolean(intune.getPolicy(serverUrl));
                } catch (error) {
                    logError('IntuneManager: Failed to read policy after enrollment', error);
                    return true;
                }
            };

            const subscription = intune.onIntuneEnrollmentChanged((event) => {
                if (event.oid !== identity.oid && !event.serverUrls?.includes(serverUrl)) {
                    return;
                }

                if (event.enrolled) {
                    finish(hasPolicy() ? 'enrolled' : 'not_protected');
                } else if (event.reason === 'not_licensed') {
                    finish('not_licensed');
                } else if (event.reason === 'not_targeted' || event.reason === 'licensed_not_targeted') {
                    finish('not_protected');
                } else if (event.reason === 'failed') {
                    finish('failed');
                }
            });
            const timer = setTimeout(() => finish('timeout'), timeoutMs);

            logDebug('IntuneManager: Enrolling in MAM and waiting for the outcome');
            intune.enrollInMAM(serverUrl, identity);
        });
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
            logDebug('IntuneManager: Starting unenrollment', {doWipe});
            if (currentServer === serverUrl) {
                await Intune.setCurrentIdentity(null);
            }
            Intune.deregisterAndUnenroll(serverUrl, doWipe);
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
    cleanupAfterWipe(oid: string): void {
        if (!Intune) {
            return;
        }

        Intune.cleanupAfterWipe(oid);
    }

    /**
     * Check if a server is managed by Intune
     * @param serverUrl - The Mattermost server URL
     * @returns true if server is Intune-managed
     */
    isManagedServer(serverUrl: string): boolean {
        if (!Intune) {
            return false;
        }

        return Intune.isManagedServer(serverUrl);
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
            if (serverUrl && Intune.isManagedServer(serverUrl)) {
                await new Promise((resolve) => setTimeout(resolve, 250));
                Emm.applyBlurEffect(0.5);
                const locale = await getCurrentUserLocale(serverUrl);
                await showBiometricFailureAlertForOrganization(serverUrl, locale, () => {
                    Emm.removeBlurEffect();
                    this.setCurrentIdentity(serverUrl);
                });
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
            const isManaged = Intune.isManagedServer(serverUrl);
            if (!isManaged) {
                return null;
            }

            return Intune.getPolicy(serverUrl);
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

    subscribeToComplianceCompleted(handler: (event: IntuneComplianceCompletedEvent) => void): EventSubscription | undefined {
        if (!Intune) {
            return undefined;
        }

        return Intune.onIntuneComplianceCompleted(handler);
    }

    subscribeToComplianceFailed(handler: (event: IntuneComplianceFailedEvent) => void): EventSubscription | undefined {
        if (!Intune) {
            return undefined;
        }

        return Intune.onIntuneComplianceFailed(handler);
    }

    /**
     * Subscribe to Company Portal required events (fires when Company Portal app needs to be installed)
     * @param handler - The callback to handle Company Portal requirement
     * @returns EventSubscription that can be removed
     */
    subscribeToCompanyPortalRequired(handler: (event: IntuneCompanyPortalRequiredEvent) => void): EventSubscription | undefined {
        if (!Intune) {
            return undefined;
        }

        return Intune.onIntuneCompanyPortalRequired(handler);
    }

    /**
     * Report wipe completion status to native layer
     * Clears pending state if successful, retains for retry if failed
     * @param oid - The OID to report completion for
     * @param success - Whether the wipe was successful
     */
    reportWipeComplete(oid: string, success: boolean): void {
        if (!Intune) {
            return;
        }

        Intune.reportWipeComplete(oid, success);
        logDebug(`IntuneManager: Wipe completion reported (success: ${success})`);
    }

    /**
     * Get pending wipes that need to be retried
     * Filters out stale wipes (> 7 days old) automatically
     * @returns Array of pending wipes (empty array if none)
     */
    getPendingWipes(): Array<{oid: string; serverUrls: string[]; timestamp: number}> {
        if (!Intune) {
            return [];
        }

        const pendingWipes = Intune.getPendingWipes();
        logDebug(`IntuneManager: Retrieved ${pendingWipes.length} pending wipe(s)`);
        return pendingWipes;
    }
}

const IntuneManager = new IntuneManagerSingleton();
export default IntuneManager;
