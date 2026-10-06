// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * EMM managed-configuration control for the iOS simulator.
 *
 * `@mattermost/react-native-emm` reads the MDM payload from
 * `UserDefaults.standard["com.apple.configuration.managed"]` — the same key an MDM
 * (Intune, Jamf, ...) writes on an enrolled device. On a simulator that dictionary can be
 * seeded with `simctl spawn <udid> defaults write <bundle id> ...`, which exercises the
 * app's config-enforcement layer (pre-filled server and username, allowOtherServers
 * autoconnect) without enrollment. Enrollment itself, app wrapping, and per-device
 * policies (copy/paste protection, blur, PIN) are out of reach here and stay manual.
 *
 * Android is refused: `RestrictionsManager` restrictions can only be set by a device or
 * profile owner (a DPC such as Test DPC), which the CI emulator does not carry.
 */
import {execFileSync} from 'child_process';

import {device} from 'detox';

import {logDebug} from '../../../provision/log';

const MANAGED_CONFIG_KEY = 'com.apple.configuration.managed';

// Keys from the app's ManagedConfig (types/global/managed_config.d.ts); MDM payloads are
// string-valued, so booleans are the strings 'true' / 'false'.
export type ManagedConfigInput = Partial<Record<
    'allowOtherServers' | 'blurApplicationScreen' | 'copyAndPasteProtection' | 'inAppPinCode' |
    'inAppSessionAuth' | 'jailbreakProtection' | 'serverName' | 'serverUrl' | 'timeout' |
    'timeoutVPN' | 'username' | 'useVPN' | 'vendor',
    string
>>;

// The Detox iOS app id. `.detoxrc.json` only carries the binary path; Maestro's
// MAESTRO_APP_ID is the same value.
const IOS_BUNDLE_ID = process.env.MM_E2E_IOS_BUNDLE_ID || 'com.mattermost.rnbeta';

const simctlDefaults = (args: string[]): string => {
    return execFileSync('xcrun', ['simctl', 'spawn', device.id, 'defaults', ...args], {stdio: 'pipe'}).toString();
};

/** Whether this platform can have a managed configuration injected (iOS simulator only). */
export const isManagedConfigControlAvailable = (): boolean => {
    if (device.getPlatform() === 'ios') {
        return true;
    }
    logDebug('[managed_config] Android managed configuration unavailable: app restrictions need a device/profile owner (DPC), which the emulator does not have');
    return false;
};

/**
 * Write the managed configuration the app will read on its next launch. Call with the
 * app terminated: `react-native-emm` also listens for UserDefaults changes, but a cold
 * launch is the only path that is deterministic on every screen.
 */
export const setIosManagedConfig = (config: ManagedConfigInput): void => {
    const pairs = Object.entries(config).flatMap(([key, value]) => (value === undefined ? [] : [key, String(value)]));
    simctlDefaults(['write', IOS_BUNDLE_ID, MANAGED_CONFIG_KEY, '-dict', ...pairs]);
    logDebug(`[managed_config] wrote ${Object.keys(config).length} managed keys for ${IOS_BUNDLE_ID}`);
};

/** Remove the managed configuration. Safe when none was written. */
export const clearIosManagedConfig = (): void => {
    try {
        simctlDefaults(['delete', IOS_BUNDLE_ID, MANAGED_CONFIG_KEY]);
        logDebug(`[managed_config] cleared managed configuration for ${IOS_BUNDLE_ID}`);
    } catch {
        // `defaults delete` fails when the key is absent — nothing to clear.
    }
};

/** Read back what the app will see, for assertions and failure messages. */
export const readIosManagedConfig = (): string => {
    try {
        return simctlDefaults(['read', IOS_BUNDLE_ID, MANAGED_CONFIG_KEY]).trim();
    } catch {
        return '';
    }
};
