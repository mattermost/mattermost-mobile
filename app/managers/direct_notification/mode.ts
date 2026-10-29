// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules, Platform} from 'react-native';

import {storeGlobal} from '@actions/app/global';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getDeviceToken, getVoIPDeviceToken, queryGlobalValue} from '@queries/app/global';

import type GlobalModel from '@typings/database/models/app/global';

export const NotificationDeliveryMode = {
    DIRECT: 'direct',
    SERVER_PUSH: 'server_push',
    OFF: 'off',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as an enum alternative
export type NotificationDeliveryMode = typeof NotificationDeliveryMode[keyof typeof NotificationDeliveryMode];

const {APP: {GLOBAL}} = MM_TABLES;
const MODE_KEY_PREFIX = 'encmaNotificationDeliveryMode:';
const DEFAULT_MODE = NotificationDeliveryMode.SERVER_PUSH;

// This cache is deliberately separate from the Direct manager. The WebSocket
// manager uses it when deciding which connections may remain alive in the
// background, without importing the WebSocket manager itself.
let cachedModes: Record<string, NotificationDeliveryMode> = {};

type NativeDirectNotificationsModule = {
    setMode?: (serverUrl: string, mode: string) => Promise<void>;
    removeServer?: (serverUrl: string) => Promise<void>;
};

function getNativeModule(): NativeDirectNotificationsModule | undefined {
    if (Platform.OS !== 'android') {
        return undefined;
    }
    return NativeModules.ENCMADirectNotifications as NativeDirectNotificationsModule | undefined;
}

export function normalizeNotificationDeliveryMode(value: unknown): NotificationDeliveryMode {
    if (value === NotificationDeliveryMode.DIRECT || value === NotificationDeliveryMode.OFF) {
        return value;
    }
    return NotificationDeliveryMode.SERVER_PUSH;
}

export function getNotificationDeliveryModeKey(serverUrl: string): string {
    return `${MODE_KEY_PREFIX}${serverUrl}`;
}

async function setNativeMode(serverUrl: string, mode: NotificationDeliveryMode): Promise<void> {
    const nativeModule = getNativeModule();
    if (nativeModule?.setMode) {
        await nativeModule.setMode(serverUrl, mode);
    }
}

async function removeNativeMode(serverUrl: string): Promise<void> {
    const nativeModule = getNativeModule();
    if (nativeModule?.removeServer) {
        await nativeModule.removeServer(serverUrl);
    }
}

export async function loadNotificationDeliveryModes(): Promise<void> {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        const records = await database.get<GlobalModel>(GLOBAL).query().fetch();
        const nextModes: Record<string, NotificationDeliveryMode> = {};
        const nativeUpdates: Array<Promise<void>> = [];

        for (const record of records) {
            if (!record.id.startsWith(MODE_KEY_PREFIX)) {
                continue;
            }
            const serverUrl = record.id.substring(MODE_KEY_PREFIX.length);
            if (!serverUrl || record.value == null) {
                continue;
            }
            const mode = normalizeNotificationDeliveryMode(record.value);
            nextModes[serverUrl] = mode;
            nativeUpdates.push(setNativeMode(serverUrl, mode));
        }

        cachedModes = nextModes;

        // Native preferences are the early, process-independent copy used to
        // suppress already-registered FCM sessions before React Native starts.
        await Promise.allSettled(nativeUpdates);
    } catch {
        // The app database is not available in a few early launch and test
        // paths. The default remains Server push until storage is readable.
    }
}

export async function getNotificationDeliveryMode(serverUrl: string): Promise<NotificationDeliveryMode> {
    const cached = cachedModes[serverUrl];
    if (cached) {
        return cached;
    }

    try {
        const records = await queryGlobalValue(getNotificationDeliveryModeKey(serverUrl))?.fetch();
        if (records?.[0]?.value != null) {
            const mode = normalizeNotificationDeliveryMode(records[0].value);
            cachedModes[serverUrl] = mode;
            return mode;
        }
    } catch {
        // Fall through to the backwards-compatible default.
    }
    return DEFAULT_MODE;
}

export function getCachedNotificationDeliveryMode(serverUrl: string): NotificationDeliveryMode {
    return cachedModes[serverUrl] || DEFAULT_MODE;
}

export function isDirectNotificationServer(serverUrl: string): boolean {
    return getCachedNotificationDeliveryMode(serverUrl) === NotificationDeliveryMode.DIRECT;
}

export function isServerPushNotificationServer(serverUrl: string): boolean {
    return getCachedNotificationDeliveryMode(serverUrl) === NotificationDeliveryMode.SERVER_PUSH;
}

export async function persistNotificationDeliveryMode(serverUrl: string, mode: NotificationDeliveryMode): Promise<void> {
    const normalizedMode = normalizeNotificationDeliveryMode(mode);

    // Write native storage first so an already registered FCM session is
    // suppressed even if the process is backgrounded immediately afterwards.
    await setNativeMode(serverUrl, normalizedMode);
    const result = await storeGlobal(getNotificationDeliveryModeKey(serverUrl), normalizedMode, false);
    if (result && typeof result === 'object' && 'error' in result && result.error) {
        throw result.error;
    }
    cachedModes[serverUrl] = normalizedMode;
}

export async function removeNotificationDeliveryMode(serverUrl: string): Promise<void> {
    await removeNativeMode(serverUrl);
    const result = await storeGlobal(getNotificationDeliveryModeKey(serverUrl), null, false);
    if (result && typeof result === 'object' && 'error' in result && result.error) {
        throw result.error;
    }
    delete cachedModes[serverUrl];
}

export async function getNotificationDeviceToken(serverUrl: string): Promise<string> {
    const mode = await getNotificationDeliveryMode(serverUrl);
    if (mode !== NotificationDeliveryMode.SERVER_PUSH) {
        return '';
    }
    return getDeviceToken();
}

export async function getNotificationVoIPDeviceToken(serverUrl: string): Promise<string> {
    const mode = await getNotificationDeliveryMode(serverUrl);
    if (mode !== NotificationDeliveryMode.SERVER_PUSH) {
        return '';
    }
    return getVoIPDeviceToken();
}

export function resetNotificationDeliveryModeCache(): void {
    cachedModes = {};
}
