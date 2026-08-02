// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import Config from '@assets/config.json';
import {getFullErrorMessage} from '@utils/errors';
import {isBetaApp} from '@utils/general';
import {
    initializeSentryTracing,
    registerNavigationContainer as registerSentryNavigationContainer,
    wrapRootComponent,
} from '@utils/sentry_tracing';

import {logError, logWarning} from './log';

import type ClientError from '@client/rest/error';
import type {Database} from '@nozbe/watermelondb';
import type {Breadcrumb, ErrorEvent} from '@sentry/core';
import type {ComponentType} from 'react';

export const BREADCRUMB_UNCAUGHT_APP_ERROR = 'uncaught-app-error';
export const BREADCRUMB_UNCAUGHT_NON_ERROR = 'uncaught-non-error';

let Sentry: typeof import('@sentry/react-native') | undefined;

function ensureSentryModule() {
    if (!Sentry) {
        Sentry = require('@sentry/react-native');
    }
    return Sentry!;
}

export function initializeSentry() {
    if (!Config.SentryEnabled) {
        return;
    }

    const dsn = getDsn();
    if (!dsn) {
        logWarning('Sentry is enabled, but not configured on this platform');
        return;
    }

    const eventFilter = Array.isArray(Config.SentryOptions?.severityLevelFilter) ? Config.SentryOptions.severityLevelFilter : [];
    const sentryOptions = {...Config.SentryOptions} as Record<string, unknown>;
    Reflect.deleteProperty(sentryOptions, 'severityLevelFilter');

    const initialized = initializeSentryTracing({
        dsn,
        environment: isBetaApp ? 'beta' : 'production',
        tracesSampleRate: isBetaApp ? 1.0 : 0.2,
        sampleRate: isBetaApp ? 1.0 : 0.2,

        // Capture profiles for sampled transactions (relative to tracesSampleRate).
        profilesSampleRate: isBetaApp ? 1.0 : 0.2,
        attachStacktrace: Boolean(isBetaApp),
        sentryOptions,
        beforeSend: (event: ErrorEvent) => {
            if (isBetaApp || (event?.level && eventFilter.includes(event.level))) {
                return event;
            }

            return null;
        },
    });

    if (initialized) {
        ensureSentryModule();
    }
}

function getDsn() {
    if (Platform.OS === 'android') {
        return Config.SentryDsnAndroid;
    } else if (Platform.OS === 'ios') {
        return Config.SentryDsnIos;
    }

    return '';
}

export function wrapWithSentry<P extends Record<string, unknown>>(RootComponent: ComponentType<P>) {
    return wrapRootComponent(RootComponent);
}

export function registerNavigationContainer(ref: unknown) {
    registerSentryNavigationContainer(ref);
}

export function captureException(error: unknown) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error) {
        logWarning('captureException called with missing arguments', error);
        return;
    }
    ensureSentryModule().captureException(error);
}

export function captureJSException(error: unknown, isFatal: boolean) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error) {
        logWarning('captureJSException called with missing arguments', error);
        return;
    }

    // Lazy require to keep early Sentry init off the critical import path.
    const ClientErrorClass = require('@client/rest/error').default as typeof ClientError;
    if (error instanceof ClientErrorClass) {
        captureClientErrorAsBreadcrumb(error, isFatal);
    } else {
        captureException(error);
    }
}

function captureClientErrorAsBreadcrumb(error: ClientError, isFatal: boolean) {
    const isAppError = Boolean(error.server_error_id);
    const breadcrumb: Breadcrumb = {
        category: isAppError ? BREADCRUMB_UNCAUGHT_APP_ERROR : BREADCRUMB_UNCAUGHT_NON_ERROR,
        data: {
            isFatal: String(isFatal),
        },
        level: 'warning',
        message: getFullErrorMessage(error),
    };

    if (breadcrumb.data) {
        if (error.server_error_id) {
            breadcrumb.data.server_error_id = error.server_error_id;
        }

        if (error.status_code) {
            breadcrumb.data.status_code = error.status_code;
        }

        const match = (/^(?:https?:\/\/)[^/]+(\/.*)$/).exec(error.url);

        if (match && match.length >= 2) {
            breadcrumb.data.url = match[1];
        }
    }

    try {
        ensureSentryModule().addBreadcrumb(breadcrumb);
    } catch (e) {
        // Do nothing since this is only here to make sure we don't crash when handling an exception
        logWarning('Failed to capture breadcrumb of non-error', e);
    }
}

const getUserContext = async (database: Database) => {
    const {getCurrentUser} = require('@queries/servers/user') as typeof import('@queries/servers/user');
    const currentUser = {
        id: 'currentUserId',
        locale: 'en',
        roles: 'multi-server-test-role',
    };

    const user = await getCurrentUser(database);

    return {
        userID: user?.id ?? currentUser.id,
        email: '',
        username: '',
        locale: user?.locale ?? currentUser.locale,
        roles: user?.roles ?? currentUser.roles,
    };
};

const getExtraContext = async (database: Database) => {
    const {getConfig} = require('@queries/servers/system') as typeof import('@queries/servers/system');
    const context = {
        config: {},
        currentChannel: {},
        currentTeam: {},
    };

    const config = await getConfig(database);
    if (config) {
        context.config = {
            BuildDate: config.BuildDate,
            BuildEnterpriseReady: config.BuildEnterpriseReady,
            BuildHash: config.BuildHash,
            BuildHashEnterprise: config.BuildHashEnterprise,
            BuildNumber: config.BuildNumber,
        };
    }

    return context;
};

const getBuildTags = async (database: Database) => {
    const {getConfig} = require('@queries/servers/system') as typeof import('@queries/servers/system');
    const tags = {
        serverBuildHash: '',
        serverBuildNumber: '',
    };

    const config = await getConfig(database);
    if (config) {
        tags.serverBuildHash = config.BuildHash;
        tags.serverBuildNumber = config.BuildNumber;
    }

    return tags;
};

export const addSentryContext = async (serverUrl: string) => {
    if (!Config.SentryEnabled) {
        return;
    }

    try {
        const sentry = ensureSentryModule();
        const databaseManagerModule = require('@database/manager');
        const DatabaseManager = databaseManagerModule.default ?? databaseManagerModule;
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userContext = await getUserContext(database);
        sentry.setContext('User-Information', userContext);

        const buildContext = await getBuildTags(database);
        sentry.setContext('App-Build Information', buildContext);

        const extraContext = await getExtraContext(database);
        sentry.setContext('Server-Information', extraContext);
    } catch (e) {
        logError(`addSentryContext for serverUrl ${serverUrl}`, e);
    }
};
