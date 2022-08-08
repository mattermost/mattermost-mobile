// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Breadcrumb} from '@sentry/types';
import {Platform} from 'react-native';

import Config from '@assets/config.json';

import {ClientError} from './client_error';
import {logError, logWarning} from './log';

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

    Sentry.init({dsn, ...Config.SentryOptions});
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

    // TODO: Get current server config and other relevant data

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

function getUserContext() {
    // TODO: Get current user data from active database
    const currentUser = {
        id: 'currentUserId',
        locale: 'en',
        roles: 'multi-server-test-role',
    };

    if (!currentUser) {
        return null;
    }

    return {
        userID: currentUser.id, // This can be changed to id after we upgrade to Sentry >= 0.14.10,
        email: '',
        username: '',
        extra: {
            locale: currentUser.locale,
            roles: currentUser.roles,
        },
    };
}

function getExtraContext() {
    const context = {};

    // TODO: Add context based on the active database

    // const currentTeam = getCurrentTeam(state);
    // if (currentTeam) {
    //     context.currentTeam = {
    //         id: currentTeam.id,
    //     };
    // }

    // const currentTeamMember = getCurrentTeamMembership(state);
    // if (currentTeamMember) {
    //     context.currentTeamMember = {
    //         roles: currentTeamMember.roles,
    //     };
    // }

    // const currentChannel = getCurrentChannel(state);
    // if (currentChannel) {
    //     context.currentChannel = {
    //         id: currentChannel.id,
    //         type: currentChannel.type,
    //     };
    // }

    // const currentChannelMember = getMyCurrentChannelMembership(state);
    // if (currentChannelMember) {
    //     context.currentChannelMember = {
    //         roles: currentChannelMember.roles,
    //     };
    // }

    // const config = getConfig(state);
    // if (config) {
    //     context.config = {
    //         BuildDate: config.BuildDate,
    //         BuildEnterpriseReady: config.BuildEnterpriseReady,
    //         BuildHash: config.BuildHash,
    //         BuildHashEnterprise: config.BuildHashEnterprise,
    //         BuildNumber: config.BuildNumber,
    //     };
    // }

    return context;
}

function getBuildTags() {
    let tags;

    // TODO: Add context based on the active database

    // const config = getConfig(state);
    // if (config) {
    //     tags = {
    //         serverBuildHash: config.BuildHash,
    //         serverBuildNumber: config.BuildNumber,
    //     };
    // }

    return tags;
}
