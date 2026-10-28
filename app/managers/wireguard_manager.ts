// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import * as KeyChain from 'react-native-keychain';

export const WireGuardStatus = {
    Disconnected: 'disconnected',
    Connecting: 'connecting',
    Connected: 'connected',
    Failed: 'failed',
} as const;

export type WireGuardConnectionStatus = typeof WireGuardStatus[keyof typeof WireGuardStatus];

export type WireGuardState = {
    status: WireGuardConnectionStatus;
    message: string | null;
    handshakeEpochMillis: number;
    rxBytes: number;
    txBytes: number;
    applicationId: string;
};

export type WireGuardConfigSummary = {
    addresses: string[];
    dnsServers: string[];
    allowedIps: string[];
    endpoints: string[];
    peerCount: number;
};

type NativeWireGuardModule = {
    addListener: (eventName: string) => void;
    removeListeners: (count: number) => void;
    getState: () => Promise<WireGuardState>;
    validateConfig: (config: string) => Promise<WireGuardConfigSummary>;
    readConfigFile: (uri: string) => Promise<string>;
    connect: (config: string) => Promise<WireGuardState>;
    disconnect: () => Promise<WireGuardState>;
    setSecureScreen: (enabled: boolean) => void;
};

const STATE_EVENT = 'ENCMAWireGuardStateChanged';
const KEYCHAIN_SERVICE = 'encma.wireguard.configuration';
const KEYCHAIN_ACCOUNT = 'wireguard-config';

function getNativeModule(): NativeWireGuardModule {
    const nativeModule = NativeModules.ENCMAWireGuard as NativeWireGuardModule | undefined;
    if (!nativeModule) {
        throw new Error('The Android WireGuard module is unavailable. Rebuild and reinstall the application.');
    }
    return nativeModule;
}

export function isWireGuardRequired(): boolean {
    return Platform.OS === 'android';
}

export async function getWireGuardState(): Promise<WireGuardState> {
    return getNativeModule().getState();
}

export async function validateWireGuardConfig(config: string): Promise<WireGuardConfigSummary> {
    return getNativeModule().validateConfig(config);
}

export async function readWireGuardConfig(uri: string): Promise<string> {
    return getNativeModule().readConfigFile(uri);
}

export async function connectWireGuard(config: string): Promise<WireGuardState> {
    return getNativeModule().connect(config);
}

export async function disconnectWireGuard(): Promise<WireGuardState> {
    return getNativeModule().disconnect();
}

export function setWireGuardSecureScreen(enabled: boolean): void {
    try {
        getNativeModule().setSecureScreen(enabled);
    } catch {
        // getState/connect still fail closed when the native module is unavailable.
    }
}

export function addWireGuardStateListener(listener: (state: WireGuardState) => void): () => void {
    try {
        const subscription = new NativeEventEmitter(getNativeModule()).addListener(STATE_EVENT, listener);
        return () => subscription.remove();
    } catch {
        // State reads remain mandatory; a missing event bridge only disables live updates.
        return () => undefined;
    }
}

export async function saveWireGuardConfig(config: string): Promise<void> {
    const stored = await KeyChain.setGenericPassword(KEYCHAIN_ACCOUNT, config, {
        service: KEYCHAIN_SERVICE,
        securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
    });
    if (stored === false) {
        throw new Error('The WireGuard configuration could not be stored securely.');
    }
}

export async function loadWireGuardConfig(): Promise<string | undefined> {
    const credentials = await KeyChain.getGenericPassword({service: KEYCHAIN_SERVICE});
    if (!credentials || credentials.username !== KEYCHAIN_ACCOUNT) {
        return undefined;
    }
    return credentials.password;
}

export async function clearWireGuardConfig(): Promise<void> {
    const cleared = await KeyChain.resetGenericPassword({service: KEYCHAIN_SERVICE});
    if (cleared === false) {
        throw new Error('The saved WireGuard configuration could not be removed.');
    }
}
