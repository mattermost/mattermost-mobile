// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Platform} from 'react-native';
import {Sentry} from 'react-native-sentry';

import Config from 'assets/config';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeam, getCurrentTeamMembership} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentChannel, getMyCurrentChannelMembership} from 'mattermost-redux/selectors/entities/channels';

export const LOGGER_EXTENSION = 'extension';
export const LOGGER_JAVASCRIPT = 'javascript';
export const LOGGER_JAVASCRIPT_WARNING = 'javascript_warning';
export const LOGGER_NATIVE = 'native';
export const LOGGER_REDUX = 'redux';

export function initializeSentry() {
    if (!Config.SentryEnabled) {
        // Still allow Sentry to configure itself in case other code tries to call it
        Sentry.config('');

        return;
    }

    const dsn = getDsn();

    if (!dsn) {
        console.warn('Sentry is enabled, but not configured on this platform'); // eslint-disable-line no-console
    }

    Sentry.config(dsn, Config.SentryOptions).install();
}

function getDsn() {
    if (Platform.OS === 'android') {
        return Config.SentryDsnAndroid;
    } else if (Platform.OS === 'ios') {
        return Config.SentryDsnIos;
    }

    return '';
}

export function captureException(error, logger, store) {
    capture(() => {
        Sentry.captureException(error, {logger});
    }, store);
}

export function captureExceptionWithoutState(err, logger) {
    if (!Config.SentryEnabled) {
        return;
    }

    try {
        Sentry.captureException(err, {logger});
    } catch (error) {
        // do nothing...
    }
}

export function captureMessage(message, logger, store) {
    capture(() => {
        Sentry.captureMessage(message, {logger});
    }, store);
}

// Wrapper function to any calls to Sentry so that we can gather any necessary extra data
// before sending.
function capture(captureFunc, store) {
    if (!Config.SentryEnabled) {
        return;
    }

    try {
        const state = store.getState();
        const config = getConfig(state);

        // Don't contact Sentry if we're connected to a server with diagnostics disabled. Note that this will
        // still log if we're not connected to any server.
        if (config.EnableDiagnostics != null && config.EnableDiagnostics !== 'true') {
            return;
        }

        Sentry.setUserContext(getUserContext(state));
        Sentry.setExtraContext(getExtraContext(state));
        Sentry.setTagsContext(getBuildTags(state));

        console.warn('Capturing with Sentry at ' + getDsn() + '...'); // eslint-disable-line no-console

        captureFunc();
    } catch (e) {
        // Don't want this to get into an infinite loop again...
        console.warn('Exception occured while sending to Sentry'); // eslint-disable-line no-console
        console.warn(e); // eslint-disable-line no-console
    }
}

function getUserContext(state) {
    const currentUser = getCurrentUser(state);

    if (!currentUser) {
        return {};
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

function getExtraContext(state) {
    const context = {};

    const currentTeam = getCurrentTeam(state);
    if (currentTeam) {
        context.currentTeam = {
            id: currentTeam.id,
        };
    }

    const currentTeamMember = getCurrentTeamMembership(state);
    if (currentTeamMember) {
        context.currentTeamMember = {
            roles: currentTeamMember.roles,
        };
    }

    const currentChannel = getCurrentChannel(state);
    if (currentChannel) {
        context.currentChannel = {
            id: currentChannel.id,
            type: currentChannel.type,
        };
    }

    const currentChannelMember = getMyCurrentChannelMembership(state);
    if (currentChannelMember) {
        context.currentChannelMember = {
            roles: currentChannelMember.roles,
        };
    }

    const config = getConfig(state);
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
}

function getBuildTags(state) {
    const tags = {};

    const config = getConfig(state);
    if (config) {
        tags.serverBuildHash = config.BuildHash;
        tags.serverBuildNumber = config.BuildNumber;
    }

    return tags;
}
