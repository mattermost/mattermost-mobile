// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';

import Config from '@assets/config.json';
import ClientError from '@client/rest/error';
import DatabaseManager from '@database/manager';
import {getConfig} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {getFullErrorMessage} from '@utils/errors';
import {isBetaApp} from '@utils/general';

import {logError, logWarning} from './log';

import type {Database} from '@nozbe/watermelondb';
import type {Breadcrumb, ErrorEvent} from '@sentry/types';

export const BREADCRUMB_UNCAUGHT_APP_ERROR_33 = 'uncaught-app-error-33';
export const BREADCRUMB_UNCAUGHT_NON_ERROR_33 = 'uncaught-non-error-33';

let Sentry33: any;
export function initializeSentry33() {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!Sentry33) {
        Sentry33 = require('@sentry/react-native');
    }

    const dsn = getDsn33();

    if (!dsn) {
        logWarning('Sentry is enabled, but not configured on this platform');
        return;
    }

    const mmConfig = {
        environment: isBetaApp ? 'beta' : 'production',
        tracesSampleRate: isBetaApp ? 1.0 : 0.2,
        sampleRate: isBetaApp ? 1.0 : 0.2,
        attachStacktrace: Boolean(isBetaApp),
    };

    const eventFilter = Array.isArray(Config.SentryOptions?.severityLevelFilter) ? Config.SentryOptions.severityLevelFilter : [];
    const sentryOptions = {...Config.SentryOptions};
    Reflect.deleteProperty(sentryOptions, 'severityLevelFilter');

    Sentry33.init({
        dsn,
        sendDefaultPii: false,
        ...mmConfig,
        ...sentryOptions,
        enableCaptureFailedRequests: false,
        integrations: [
            Sentry33.reactNativeNavigationIntegration({navigation: Navigation}),
        ],
        beforeSend: (event: ErrorEvent) => {
            if (isBetaApp || (event?.level && eventFilter.includes(event.level))) {
                return event;
            }
            return null;
        },
    });
}

function getDsn33() {
    if (Platform.OS === 'android') {
        return Config.SentryDsnAndroid;
    } else if (Platform.OS === 'ios') {
        return Config.SentryDsnIos;
    }
    return '';
}

export function captureException33(error: unknown) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error) {
        logWarning('captureException called with missing arguments', error);
        return;
    }
    Sentry33.captureException(error);
}

export function captureJSException33(error: unknown, isFatal: boolean) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error) {
        logWarning('captureJSException called with missing arguments', error);
        return;
    }

    if (error instanceof ClientError) {
        captureClientErrorAsBreadcrumb33(error, isFatal);
    } else {
        captureException33(error);
    }
}

function captureClientErrorAsBreadcrumb33(error: ClientError, isFatal: boolean) {
    const isAppError = Boolean(error.server_error_id);
    const breadcrumb: Breadcrumb = {
        category: isAppError ? BREADCRUMB_UNCAUGHT_APP_ERROR_33 : BREADCRUMB_UNCAUGHT_NON_ERROR_33,
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
        Sentry33.addBreadcrumb(breadcrumb);
    } catch (e) {
        logWarning('Failed to capture breadcrumb of non-error', e);
    }
}

export const addSentryContext33 = async (serverUrl: string) => {
    if (!Config.SentryEnabled || !Sentry33) {
        return;
    }

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userContext = await getUserContext33(database);
        Sentry33.setContext('User-Information', userContext);

        const buildContext = await getBuildTags33(database);
        Sentry33.setContext('App-Build Information', buildContext);

        const extraContext = await getExtraContext33(database);
        Sentry33.setContext('Server-Information', extraContext);
    } catch (e) {
        logError('addSentryContext for serverUrl ', e);
    }
};

const getUserContext33 = async (database: Database) => {
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

const getExtraContext33 = async (database: Database) => {
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

const getBuildTags33 = async (database: Database) => {
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
