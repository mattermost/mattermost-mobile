// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Re-exports Intune types and enums with fallback stubs when disabled.
 * This allows other files to import Intune types without conditional logic.
 *
 * IMPORTANT: This file duplicates types from @mattermost/intune library.
 * When updating Intune library types, update these types to match.
 */

import {Platform, type EventSubscription} from 'react-native';

// Try to import enums from Intune library at runtime
let IntuneAuthRequiredReasonsExport: Record<string, string> | null = null;
let IntuneConditionalLaunchBlockedReasonsExport: Record<string, string> | null = null;

if (Platform.OS === 'ios') {
    try {
        const errors = require('@mattermost/intune/src/errors');
        IntuneAuthRequiredReasonsExport = errors.IntuneAuthRequiredReasons;
        IntuneConditionalLaunchBlockedReasonsExport = errors.IntuneConditionalLaunchBlockedReasons;
    } catch {
        // Intune library not available - use stub enums below
    }
}

// Export enum objects - can be used both as type and runtime value
// These match the string values used by the native iOS module
export const IntuneConditionalLaunchBlockedReasons = IntuneConditionalLaunchBlockedReasonsExport ?? {
    LAUNCH_BLOCKED: 'launch_blocked' as const,
    LAUNCH_CANCELED: 'launch_canceled' as const,
};

export const IntuneAuthRequiredReasons = IntuneAuthRequiredReasonsExport ?? {
    CONSENT_DENIED: 'consent_denied' as const,
    AUTH_FAILED: 'auth_failed' as const,
    TOKEN_REFRESH_FAILED: 'refresh_token_failed' as const,
};

// ============================================================================
// Type definitions - must match @mattermost/intune library types exactly
// ============================================================================

export type IntuneMAMSaveLocation = {
    Other: boolean;
    OneDriveForBusiness: boolean;
    SharePoint: boolean;
    LocalDrive: boolean;
    PhotoLibrary: boolean;
    CameraRoll: boolean;
    FilesApp: boolean;
    iCloudDrive: boolean;
};

export type IntunePolicy = Readonly<{
    isPINRequired: boolean;
    isContactSyncAllowed: boolean;
    isWidgetContentSyncAllowed: boolean;
    isSpotlightIndexingAllowed: boolean;
    areSiriIntentsAllowed: boolean;
    areAppIntentsAllowed: boolean;
    isAppSharingAllowed: boolean;
    shouldFileProviderEncryptFiles: boolean;
    isManagedBrowserRequired: boolean;
    isFileEncryptionRequired: boolean;
    isScreenCaptureAllowed: boolean;
    notificationPolicy: number;
    allowedSaveLocations: IntuneMAMSaveLocation;
    allowedOpenLocations: number;
}>;

export type MSALIdentity = Readonly<{
    upn: string;
    tid: string;
    oid: string;
}>;

export type MSALTokens = Readonly<{
    idToken: string;
    accessToken: string;
    identity: MSALIdentity;
}>;

export type IntuneAuthRequiredEvent = Readonly<{
    oid: string;
    serverUrls: string[];
    reason?: string;
}>;

export type IntuneConditionalLaunchBlockedEvent = Readonly<{
    oid: string;
    serverUrls: string[];
    reason: string;
}>;

export type IntuneEnrollmentChangedEvent = Readonly<{
    enrolled: boolean;
    oid: string;
    serverUrls: string[];
    reason?: string;
}>;

export type IntuneIdentitySwitchRequiredEvent = Readonly<{
    oid: string;
    serverUrls: string[];
    reason: string;
}>;

export type IntunePolicyChangedEvent = Readonly<{
    oid: string;
    changed: boolean;
    removed?: boolean;
    policy?: IntunePolicy | null;
    serverUrls: string[];
}>;

export type IntuneWipeRequestedEvent = Readonly<{
    oid: string;
    serverUrls: string[];
}>;

export type PendingWipe = Readonly<{
    oid: string;
    serverUrls: string[];
    timestamp: number;
}>;

export type IntuneSpec = {
    addListener: (eventType: string) => void;
    removeListeners: (count: number) => void;
    login(serverUrl: string, scopes: string[]): Promise<MSALTokens>;
    enrollInMAM(serverUrl: string, identity: MSALIdentity): Promise<void>;
    isManagedServer(serverUrl: string): Promise<boolean>;
    deregisterAndUnenroll(serverUrl: string, doWipe: boolean): Promise<void>;
    cleanupAfterWipe(oid: string): Promise<void>;
    reportWipeComplete(oid: string, success: boolean): Promise<void>;
    getPendingWipes(): Promise<PendingWipe[]>;
    setCurrentIdentity(serverUrl: string | null): Promise<void>;
    getPolicy(serverUrl: string): Promise<IntunePolicy | null>;

    onIntuneEnrollmentChanged: (listener: (event: IntuneEnrollmentChangedEvent) => void) => EventSubscription;
    onIntunePolicyChanged: (listener: (event: IntunePolicyChangedEvent) => void) => EventSubscription;
    onIntuneWipeRequested: (listener: (event: IntuneWipeRequestedEvent) => void) => EventSubscription;
    onIntuneAuthRequired: (listener: (event: IntuneAuthRequiredEvent) => void) => EventSubscription;
    onIntuneConditionalLaunchBlocked: (listener: (event: IntuneConditionalLaunchBlockedEvent) => void) => EventSubscription;
    onIntuneIdentitySwitchRequired: (listener: (event: IntuneIdentitySwitchRequiredEvent) => void) => EventSubscription;
}
