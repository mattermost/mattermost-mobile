// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type TurboModule, TurboModuleRegistry} from 'react-native';

export type MSALIdentity = Readonly<{
    upn: string; // user@contoso.com
    tid: string; // tenant-id
    oid: string; // object-id (enrollment key)
}>;

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

    // Enum for notifications (0=allow, 1=blockOrgData, 2=block)
    notificationPolicy: number;

    // Bitmasks for save/open locations
    allowedSaveLocations: number; // Use with IntuneMAMSaveLocation enum
    allowedOpenLocations: number; // Use with IntuneMAMOpenLocation enum
}>;

// Event Names
export const IntuneEvents = {
    IntuneEnrollmentChanged: 'IntuneEnrollmentChanged',
    IntunePolicyChanged: 'IntunePolicyChanged',
    IntuneWipeRequested: 'IntuneWipeRequested',
    IntuneAuthRequired: 'IntuneAuthRequired',
    IntuneConditionalLaunchBlocked: 'IntuneConditionalLaunchBlocked',
    IntuneIdentitySwitchRequired: 'IntuneIdentitySwitchRequired',
} as const;

// Event Types
export type IntuneEnrollmentChangedEvent = Readonly<{
    enrolled: boolean;
    reason?: 'success' | 'not_targeted' | 'not_licensed' | 'account_removed_by_user' |
             'account_removed_from_device' | 'account_removed_by_wipe' | 'policy_record_gone' |
             'licensed_not_targeted' | 'failed' | 'unenrolled' | 'unenroll_failed';
    oid: string;
    serverUrls: string[]; // All servers using this OID
}>;

export type IntunePolicyChangedEvent = Readonly<{
    oid: string;
    changed: boolean;
    removed?: boolean; // True when policy record is gone (code 220)
    policy?: IntunePolicy | null; // Null if removed, otherwise the current policy
    serverUrls: string[];
}>;

export type IntuneWipeRequestedEvent = Readonly<{
    oid: string;
    serverUrls: string[]; // All servers that need wiping for this OID
}>;

export type IntuneAuthRequiredEvent = Readonly<{
    oid: string;
    serverUrls: string[]; // Empty array if account not yet enrolled
}>;

export type IntuneConditionalLaunchBlockedEvent = Readonly<{
    oid: string;
    reason: number; // IntuneMAMBlockAccountReason enum value
    serverUrls: string[];
}>;

export type IntuneIdentitySwitchRequiredEvent = Readonly<{
    oid: string;
    reason: 'open_url' | 'cancel_conditional_launch' | 'document_import' | 'unknown';
    serverUrls: string[];
}>;

export interface Spec extends TurboModule {
    addListener: (eventType: string) => void;
    removeListeners: (count: number) => void;

    // MSAL + Enrollment
    attachAndEnroll(serverUrl: string, loginHint: string): Promise<MSALIdentity>;

    // Status (queries SDK, not database)
    getEnrolledAccount(): Promise<string | null>; // Returns OID from SDK
    isManagedServer(serverUrl: string): Promise<boolean>;

    // Unenrollment
    deregisterAndUnenroll(serverUrl: string, oid: string, doWipe: boolean): Promise<void>;

    // Identity Switching
    setCurrentIdentity(serverUrl: string | null): Promise<void>;

    // Policy (queries SDK cache)
    getPolicy(serverUrl: string): Promise<IntunePolicy | null>;

    // Helper checks
    isScreenCaptureAllowed(serverUrl: string): Promise<boolean>;
    canSaveToLocation(location: number, serverUrl: string): Promise<boolean>;
}

export default TurboModuleRegistry.get<Spec>('RNIntune');
