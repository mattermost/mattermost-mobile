// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import GenericClient from '@mattermost/react-native-network-client';
import {Linking} from 'react-native';
import urlParse from 'url-parse';

import {Files} from '@constants';
import {emptyFunction} from '@utils/general';
import {logDebug} from '@utils/log';

import {latinise} from './latinise';

const ytRegex = /(?:http|https):\/\/(?:www\.|m\.)?(?:(?:youtube\.com\/(?:(?:v\/)|(?:(?:watch|embed\/watch)(?:\/|.*v=))|(?:embed\/)|(?:user\/[^/]+\/u\/[0-9]\/)))|(?:youtu\.be\/))([^#&?]*)/;

export function isValidUrl(url = '') {
    const regex = /^https?:\/\//i;
    return regex.test(url);
}

export function isParsableUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        return Boolean(parsedUrl);
    } catch {
        return false;
    }
}

export function sanitizeUrl(url: string, useHttp = false) {
    let preUrl = urlParse(url, true);
    let protocol = useHttp ? 'http:' : preUrl.protocol;

    if (!preUrl.host || preUrl.protocol === 'file:') {
        preUrl = urlParse('https://' + stripTrailingSlashes(url), true);
    }

    if (preUrl.protocol === 'http:' && !useHttp) {
        protocol = 'https:';
    } else if (!protocol) {
        protocol = useHttp ? 'http:' : 'https:';
    }

    return stripTrailingSlashes(
        `${protocol}//${preUrl.host}${preUrl.pathname}`,
    );
}

export async function getUrlAfterRedirect(url: string, useHttp = false) {
    const link = sanitizeUrl(url, useHttp);
    try {
        const result = await fetch(link, {
            method: 'HEAD',
        });
        return {url: result.url};
    } catch (error) {
        return {error};
    }
}

export async function getServerUrlAfterRedirect(serverUrl: string, useHttp = false) {
    let url = sanitizeUrl(serverUrl, useHttp);

    try {
        const resp = await GenericClient.head(url);
        if (resp.redirectUrls?.length) {
            url = resp.redirectUrls[resp.redirectUrls.length - 1];
        }
    } catch (error) {
        logDebug('getServerUrlAfterRedirect error', url, error);
        return {error};
    }

    return {url: sanitizeUrl(url, useHttp)};
}

export function stripTrailingSlashes(url = '') {
    return url.replace(/ /g, '').replace(/^\/+/, '').replace(/\/+$/, '');
}

export function removeProtocol(url = '') {
    return url.replace(/(^\w+:|^)\/\//, '');
}

export function extractFirstLink(text: string) {
    const pattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[-A-Z0-9+\u0026\u2019@#/%?=()~_|!:,.;]*[-A-Z0-9+\u0026@#/%=~()_|])/i;
    let inText = text;

    // strip out code blocks
    inText = inText.replace(/`[^`]*`/g, '');

    // strip out inline markdown images
    inText = inText.replace(/!\[[^\]]*]\([^)]*\)/g, '');

    const match = pattern.exec(inText);
    if (match) {
        return match[0].trim();
    }

    return '';
}

export function extractStartLink(text: string) {
    const pattern = /^((?:https?|ftp):\/\/[-A-Z0-9+\u0026\u2019@#/%?=()~_|!:,.;]*[-A-Z0-9+\u0026@#/%=~()_|])/i;
    let inText = text;

    // strip out code blocks
    inText = inText.replace(/`[^`]*`/g, '');

    // strip out inline markdown images
    inText = inText.replace(/!\[[^\]]*]\([^)]*\)/g, '');

    const match = pattern.exec(inText);
    if (match) {
        return match[0].trim();
    }

    return '';
}

export function isYoutubeLink(link: string) {
    return link.trim().match(ytRegex);
}

export function isImageLink(link: string) {
    let linkWithoutQuery = link;
    if (link.indexOf('?') !== -1) {
        linkWithoutQuery = linkWithoutQuery.split('?')[0];
    }

    for (let i = 0; i < Files.IMAGE_TYPES.length; i++) {
        const imageType = Files.IMAGE_TYPES[i];

        if (linkWithoutQuery.endsWith('.' + imageType) || linkWithoutQuery.endsWith('=' + imageType)) {
            return true;
        }
    }

    return false;
}

// Converts the protocol of a link (eg. http, ftp) to be lower case since
// Android doesn't handle uppercase links.
export function normalizeProtocol(url: string) {
    const index = url.indexOf(':');
    if (index === -1) {
        // There's no protocol on the link to be normalized
        return url;
    }

    const protocol = url.substring(0, index);
    return protocol.toLowerCase() + url.substring(index);
}

export function getShortenedURL(url = '', getLength = 27) {
    if (url.length > 35) {
        const subLength = getLength - 14;
        return url.substring(0, 10) + '...' + url.substring(url.length - subLength, url.length) + '/';
    }
    return url + '/';
}

export function cleanUpUrlable(input: string) {
    let cleaned = latinise(input);
    cleaned = cleaned.trim().replace(/-/g, ' ').replace(/[^\w\s]/gi, '').toLowerCase().replace(/\s/g, '-');
    cleaned = cleaned.replace(/-{2,}/, '-');
    cleaned = cleaned.replace(/^-+/, '');
    cleaned = cleaned.replace(/-+$/, '');
    return cleaned;
}

export function getScheme(url: string) {
    const match = (/([a-z0-9+.-]+):/i).exec(url);

    return match && match[1];
}

export function getYouTubeVideoId(link?: string) {
    if (!link) {
        return '';
    }

    // https://youtube.com/watch?v=<id>
    let match = (/youtube\.com\/watch\?\S*\bv=([a-zA-Z0-9_-]{6,11})/g).exec(link);
    if (match) {
        return match[1];
    }

    // https://youtube.com/embed/<id>
    match = (/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,11})/g).exec(link);
    if (match) {
        return match[1];
    }

    // https://youtu.be/<id>
    match = (/youtu.be\/([a-zA-Z0-9_-]{6,11})/g).exec(link);
    if (match) {
        return match[1];
    }

    return '';
}

export function tryOpenURL(url: string, onError: (error: unknown) => void = emptyFunction, onSuccess = emptyFunction) {
    Linking.openURL(url).
        then(onSuccess).
        catch(onError);
}

// Given a URL from an API request, return a URL that has any parts removed that are either sensitive or that would
// prevent properly grouping the messages in Sentry.
export function cleanUrlForLogging(baseUrl: string, apiUrl: string): string {
    let url = apiUrl;

    // Trim the host name
    url = url.substring(baseUrl.length);

    // Filter the query string
    const index = url.indexOf('?');
    if (index !== -1) {
        url = url.substring(0, index);
    }

    // A non-exhaustive whitelist to exclude parts of the URL that are unimportant (eg IDs) or may be sentsitive
    // (eg email addresses). We prefer filtering out fields that aren't recognized because there should generally
    // be enough left over for debugging.
    //
    // Note that new API routes don't need to be added here since this shouldn't be happening for newly added routes.
    const whitelist = new Set([
        'api', 'v4', 'users', 'teams', 'scheme', 'name', 'members', 'channels', 'posts', 'reactions', 'commands',
        'files', 'preferences', 'hooks', 'incoming', 'outgoing', 'oauth', 'apps', 'emoji', 'brand', 'image',
        'data_retention', 'jobs', 'plugins', 'roles', 'system', 'timezones', 'schemes', 'redirect_location', 'patch',
        'mfa', 'password', 'reset', 'send', 'active', 'verify', 'terms_of_service', 'login', 'logout', 'ids',
        'usernames', 'me', 'username', 'email', 'default', 'sessions', 'revoke', 'all', 'device', 'status',
        'search', 'switch', 'authorized', 'authorize', 'deauthorize', 'tokens', 'disable', 'enable', 'exists', 'unread',
        'invite', 'batch', 'stats', 'import', 'schemeRoles', 'direct', 'group', 'convert', 'view', 'search_autocomplete',
        'thread', 'info', 'flagged', 'pinned', 'pin', 'unpin', 'opengraph', 'actions', 'thumbnail', 'preview', 'link',
        'delete', 'logs', 'ping', 'config', 'client', 'license', 'websocket', 'webrtc', 'token', 'regen_token',
        'autocomplete', 'execute', 'regen_secret', 'policy', 'type', 'cancel', 'reload', 'environment', 's3_test', 'file',
        'caches', 'invalidate', 'database', 'recycle', 'compliance', 'reports', 'cluster', 'ldap', 'test', 'sync', 'saml',
        'certificate', 'public', 'private', 'idp', 'elasticsearch', 'purge_indexes', 'analytics', 'old', 'webapp', 'fake',
    ]);

    url = url.split('/').map((part) => {
        if (part !== '' && !whitelist.has(part)) {
            return '<filtered>';
        }

        return part;
    }).join('/');

    if (index !== -1) {
        // Add this on afterwards since it wouldn't pass the whitelist
        url += '?<filtered>';
    }

    return url;
}

export function extractFilenameFromUrl(url: string) {
    const uri = urlParse(url);
    return uri.pathname.split('/').pop();
}

export function safeDecodeURIComponent(v: string) {
    try {
        return decodeURIComponent(v);
    } catch {
        return v;
    }
}
