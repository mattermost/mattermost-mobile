// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {Breadcrumb} from '@sentry/types';
import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';

import Config from '@assets/config.json';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getCurrentChannel} from '@queries/servers/channel';
import {getConfig, getCurrentTeamId} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import MyChannelModel from '@typings/database/models/servers/my_channel';

import {ClientError} from './client_error';
import {logError, logWarning} from './log';

import type MyTeamModel from '@typings/database/models/servers/my_team';

export const BREADCRUMB_UNCAUGHT_APP_ERROR = 'uncaught-app-error';
export const BREADCRUMB_UNCAUGHT_NON_ERROR = 'uncaught-non-error';
export const LOGGER_EXTENSION = 'extension';
export const LOGGER_JAVASCRIPT = 'javascript';
export const LOGGER_JAVASCRIPT_WARNING = 'javascript_warning';
export const LOGGER_NATIVE = 'native';

let Sentry: any;

export function initializeSentry() {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!Sentry) {
        Sentry = require('@sentry/react-native');
    }

    const dsn = getDsn();

    if (!dsn) {
        logWarning('Sentry is enabled, but not configured on this platform');
        return;
    }

    Sentry.init({
        dsn,
        tracesSampleRate: 0.2,
        integrations: [
            new Sentry.ReactNativeTracing({

                // Pass instrumentation to be used as `routingInstrumentation`
                routingInstrumentation: new Sentry.ReactNativeNavigationInstrumentation(
                    Navigation,
                ),
            }),
        ],
        ...Config.SentryOptions,
    });
}

function getDsn() {
    if (Platform.OS === 'android') {
        return Config.SentryDsnAndroid;
    } else if (Platform.OS === 'ios') {
        return Config.SentryDsnIos;
    }

    return '';
}

export function captureException(error: Error | string, logger: string) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error || !logger) {
        logWarning('captureException called with missing arguments', error, logger);
        return;
    }

    capture(() => {
        Sentry.captureException(error, {logger});
    });
}

export function captureJSException(error: Error | ClientError, isFatal: boolean) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error) {
        logWarning('captureJSException called with missing arguments', error);
        return;
    }

    if (error instanceof ClientError) {
        captureClientErrorAsBreadcrumb(error, isFatal);
    } else {
        captureException(error, LOGGER_JAVASCRIPT);
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
    };

    if (error.intl?.defaultMessage) {
        breadcrumb.message = error.intl.defaultMessage;
    } else {
        breadcrumb.message = error.message;
    }

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
        Sentry.addBreadcrumb(breadcrumb);
    } catch (e) {
        // Do nothing since this is only here to make sure we don't crash when handling an exception
        logWarning('Failed to capture breadcrumb of non-error', e);
    }
}

// Wrapper function to any calls to Sentry so that we can gather any necessary extra data
// before sending.
function capture(captureFunc: () => void, config?: ClientConfig) {
    if (config?.EnableDiagnostics !== 'true') {
        return;
    }

    try {
        let hasUserContext = false;
        const userContext = getUserContext();
        if (userContext) {
            hasUserContext = true;
            Sentry.setUserContext(userContext);
        }

        const extraContext = getExtraContext();
        if (Object.keys(extraContext).length) {
            Sentry.setExtraContext(extraContext);
        }

        const buildTags = getBuildTags();
        if (buildTags) {
            Sentry.setTagsContext(buildTags);
        }

        if (hasUserContext) {
            logWarning('Capturing with Sentry at ' + getDsn() + '...');
            captureFunc();
        } else {
            logWarning('No user context, skipping capture');
        }
    } catch (e) {
        // Don't want this to get into an infinite loop again...
        logError('Exception occurred while sending to Sentry');
        logError(e);
    }
}

async function getUserContext() {
    const currentUser = {
        id: 'currentUserId',
        locale: 'en',
        roles: 'multi-server-test-role',
    };

    const db = await getActiveServerDatabase();
    if (db) {
        const user = await getCurrentUser(db);
        if (user) {
            currentUser.id = user.id;
            currentUser.locale = user.locale;
            currentUser.roles = user.roles;
        }
    }

    return {
        userID: currentUser.id,
        email: '',
        username: '',
        extra: {
            locale: currentUser.locale,
            roles: currentUser.roles,
        },
    };
}

async function getExtraContext() {
    const context = {
        config: {},
        currentChannel: {},
        currentChannelMember: {},
        currentTeam: {},
        currentTeamMember: {},
    };

    const extraContext = await getServerContext();
    if (extraContext) {
        context.config = {
            BuildDate: extraContext.config?.BuildDate,
            BuildEnterpriseReady: extraContext.config?.BuildEnterpriseReady,
            BuildHash: extraContext.config?.BuildHash,
            BuildHashEnterprise: extraContext.config?.BuildHashEnterprise,
            BuildNumber: extraContext.config?.BuildNumber,
        };
        context.currentChannel = {
            id: extraContext.channel?.id,
            type: extraContext.channel?.type,
        };
        context.currentChannelMember = {
            roles: extraContext.channelRoles,
        };
        context.currentTeam = {
            id: extraContext.teamId,
        };
        context.currentTeamMember = {
            roles: extraContext.teamRoles,
        };
    }

    return context;
}

async function getBuildTags() {
    let tags;
    const db = await getActiveServerDatabase();
    if (db) {
        const config = await getConfig(db);
        if (config) {
            tags = {
                serverBuildHash: config.BuildHash,
                serverBuildNumber: config.BuildNumber,
            };
        }
    }

    return tags;
}

const getServerContext = async () => {
    const db = await getActiveServerDatabase();
    if (db) {
        const config = await getConfig(db);
        const currentTeamId = await getCurrentTeamId(db);

        const myTeam = await db.get<MyTeamModel>(MM_TABLES.SERVER.MY_TEAM).query(Q.where('id', currentTeamId)).fetch();
        const teamRoles = myTeam?.[0]?.roles;

        const channel = await getCurrentChannel(db);
        let channelRoles;
        if (channel) {
            const myChannel = await db.get<MyChannelModel>(MM_TABLES.SERVER.MY_CHANNEL).query(Q.where('id', channel.id)).fetch();
            channelRoles = myChannel?.[0]?.roles;
        }

        return {
            channel,
            channelRoles,
            config,
            teamId: currentTeamId,
            teamRoles,
        };
    }
    return null;
};

const getActiveServerDatabase = async () => {
    const server = await DatabaseManager.getActiveServerDatabase();
    return server;
};

