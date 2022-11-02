// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {Breadcrumb} from '@sentry/types';
import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';

import Config from '@assets/config.json';
import {MM_TABLES} from '@constants/database';
import {getCurrentChannel} from '@queries/servers/channel';
import {getConfig, getCurrentTeamId} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import MyChannelModel from '@typings/database/models/servers/my_channel';
import MyTeamModel from '@typings/database/models/servers/my_team';

import {ClientError} from './client_error';
import {logWarning} from './log';

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
        sendDefaultPii: false,
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
    Sentry.captureException(error, {logger});
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

export const getUserContext = async (database: Database) => {
    const currentUser = {
        id: 'currentUserId',
        locale: 'en',
        roles: 'multi-server-test-role',
    };

    const user = await getCurrentUser(database);
    if (user) {
        currentUser.id = user.id;
        currentUser.locale = user.locale;
        currentUser.roles = user.roles;
    }

    return {
        userID: currentUser.id,
        email: '',
        username: '',

        locale: currentUser.locale,
        roles: currentUser.roles,

    };
};

export const getExtraContext = async (database: Database) => {
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
    const currentTeamId = await getCurrentTeamId(database);
    const myTeam = await database.get<MyTeamModel>(MM_TABLES.SERVER.MY_TEAM).query(Q.where('id', currentTeamId)).fetch();
    const teamRoles = myTeam?.[0]?.roles;
    context.currentTeam = {
        TeamId: currentTeamId,
        TeamRoles: teamRoles,
    };

    const channel = await getCurrentChannel(database);
    let channelRoles;
    if (channel) {
        const myChannel = await database.get<MyChannelModel>(MM_TABLES.SERVER.MY_CHANNEL).query(Q.where('id', channel.id)).fetch();
        channelRoles = myChannel?.[0]?.roles;
        context.currentChannel = {
            ChannelId: channel?.id,
            ChannelRoles: channelRoles,
            ChannelType: channel?.type,
        };
    }

    return context;
};

export const getBuildTags = async (database: Database) => {
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

