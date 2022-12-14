// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl, IntlShape} from 'react-intl';
import urlParse from 'url-parse';

import {makeDirectChannel, switchToChannelByName} from '@actions/remote/channel';
import {appEntry} from '@actions/remote/entry';
import {showPermalink} from '@actions/remote/permalink';
import {fetchUsersByUsernames} from '@actions/remote/user';
import {DeepLink, Launch, Screens} from '@constants';
import {getDefaultThemeByAppearance} from '@context/theme';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {getActiveServerUrl} from '@queries/app/servers';
import {getCurrentUser, queryUsersByUsername} from '@queries/servers/user';
import {dismissAllModalsAndPopToRoot, showModal} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {errorBadChannel, errorUnkownUser} from '@utils/draft';
import {logError} from '@utils/log';
import {escapeRegex} from '@utils/markdown';
import {addNewServer} from '@utils/server';
import {removeProtocol} from '@utils/url';

import type {DeepLinkChannel, DeepLinkDM, DeepLinkGM, DeepLinkPermalink, DeepLinkPlugin, DeepLinkWithData, LaunchProps} from '@typings/launch';

export async function handleDeepLink(deepLinkUrl: string, intlShape?: IntlShape, location?: string) {
    try {
        const parsed = parseDeepLink(deepLinkUrl);
        if (parsed.type === DeepLink.Invalid || !parsed.data || !parsed.data.serverUrl) {
            return {error: true};
        }

        const currentServerUrl = await getActiveServerUrl();
        if (!currentServerUrl) {
            return {error: true};
        }

        const existingServerUrl = DatabaseManager.searchUrl(parsed.data.serverUrl);

        // After checking the server for http & https then we add it
        if (!existingServerUrl) {
            const theme = EphemeralStore.theme || getDefaultThemeByAppearance();
            addNewServer(theme, parsed.data.serverUrl, undefined, parsed);
            return {error: false};
        }

        if (existingServerUrl !== currentServerUrl && NavigationStore.getVisibleScreen()) {
            await dismissAllModalsAndPopToRoot();
            DatabaseManager.setActiveServerDatabase(existingServerUrl);
            appEntry(existingServerUrl, Date.now());
            await NavigationStore.waitUntilScreenHasLoaded(Screens.HOME);
        }

        const {database} = DatabaseManager.getServerDatabaseAndOperator(existingServerUrl);
        const currentUser = await getCurrentUser(database);
        const locale = currentUser?.locale || DEFAULT_LOCALE;
        const intl = intlShape || createIntl({
            locale,
            messages: getTranslations(locale),
        });

        switch (parsed.type) {
            case DeepLink.Channel: {
                const deepLinkData = parsed.data as DeepLinkChannel;
                switchToChannelByName(existingServerUrl, deepLinkData.channelName, deepLinkData.teamName, errorBadChannel, intl);
                break;
            }
            case DeepLink.DirectMessage: {
                const deepLinkData = parsed.data as DeepLinkDM;
                const userIds = await queryUsersByUsername(database, [deepLinkData.userName]).fetchIds();
                let userId = userIds.length ? userIds[0] : undefined;
                if (!userId) {
                    const {users} = await fetchUsersByUsernames(existingServerUrl, [deepLinkData.userName], false);
                    if (users?.length) {
                        userId = users[0].id;
                    }
                }

                if (userId) {
                    makeDirectChannel(existingServerUrl, userId, '', true);
                } else {
                    errorUnkownUser(intl);
                }
                break;
            }
            case DeepLink.GroupMessage: {
                const deepLinkData = parsed.data as DeepLinkGM;
                switchToChannelByName(existingServerUrl, deepLinkData.channelId, deepLinkData.teamName, errorBadChannel, intl);
                break;
            }
            case DeepLink.Permalink: {
                const deepLinkData = parsed.data as DeepLinkPermalink;
                if (NavigationStore.hasModalsOpened() || ![Screens.HOME, Screens.CHANNEL, Screens.GLOBAL_THREADS, Screens.THREAD].includes(NavigationStore.getVisibleScreen())) {
                    await dismissAllModalsAndPopToRoot();
                }
                showPermalink(existingServerUrl, deepLinkData.teamName, deepLinkData.postId);
                break;
            }
            case DeepLink.Plugin: {
                const deepLinkData = parsed.data as DeepLinkPlugin;
                showModal('PluginInternal', deepLinkData.id, {link: location});
                break;
            }
        }
        return {error: false};
    } catch (error) {
        logError('Failed to open channel from deeplink', error);
        return {error: true};
    }
}

export function parseDeepLink(deepLinkUrl: string): DeepLinkWithData {
    const url = removeProtocol(deepLinkUrl);

    let match = new RegExp('(.*)\\/([^\\/]+)\\/channels\\/(\\S+)').exec(url);
    if (match) {
        return {type: DeepLink.Channel, url: deepLinkUrl, data: {serverUrl: match[1], teamName: match[2], channelName: match[3]}};
    }

    match = new RegExp('(.*)\\/([^\\/]+)\\/pl\\/(\\w+)').exec(url);
    if (match) {
        return {type: DeepLink.Permalink, url: deepLinkUrl, data: {serverUrl: match[1], teamName: match[2], postId: match[3]}};
    }

    match = new RegExp('(.*)\\/([^\\/]+)\\/messages\\/@(\\S+)').exec(url);
    if (match) {
        return {type: DeepLink.DirectMessage, url: deepLinkUrl, data: {serverUrl: match[1], teamName: match[2], userName: match[3]}};
    }

    match = new RegExp('(.*)\\/([^\\/]+)\\/messages\\/(\\S+)').exec(url);
    if (match) {
        return {type: DeepLink.GroupMessage, url: deepLinkUrl, data: {serverUrl: match[1], teamName: match[2], channelId: match[3]}};
    }

    match = new RegExp('(.*)\\/plugins\\/([^\\/]+)\\/(\\S+)').exec(url);
    if (match) {
        return {type: DeepLink.Plugin, url: deepLinkUrl, data: {serverUrl: match[1], id: match[2], teamName: ''}};
    }

    return {type: DeepLink.Invalid, url: deepLinkUrl};
}

export function matchDeepLink(url?: string, serverURL?: string, siteURL?: string) {
    if (!url || (!serverURL && !siteURL)) {
        return '';
    }

    let urlToMatch = url;
    const urlBase = serverURL || siteURL || '';

    if (!url.startsWith('mattermost://')) {
        // If url doesn't contain site or server URL, tack it on.
        // e.g. <jump to convo> URLs from autolink plugin.
        const match = new RegExp(escapeRegex(urlBase)).exec(url);
        if (!match) {
            urlToMatch = urlBase + url;
        }
    }

    if (urlParse(urlToMatch).hostname === urlParse(urlBase).hostname) {
        return urlToMatch;
    }

    return '';
}

export const getLaunchPropsFromDeepLink = (deepLinkUrl: string, coldStart = false): LaunchProps => {
    const parsed = parseDeepLink(deepLinkUrl);
    const launchProps: LaunchProps = {
        launchType: Launch.DeepLink,
        coldStart,
    };

    switch (parsed.type) {
        case DeepLink.Invalid:
            launchProps.launchError = true;
            break;
        default: {
            launchProps.extra = parsed;
            break;
        }
    }

    return launchProps;
};
