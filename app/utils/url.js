// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {latinise} from './latinise.js';

const ytRegex = /(?:http|https):\/\/(?:www\.|m\.)?(?:(?:youtube\.com\/(?:(?:v\/)|(?:(?:watch|embed\/watch)(?:\/|.*v=))|(?:embed\/)|(?:user\/[^/]+\/u\/[0-9]\/)))|(?:youtu\.be\/))([^#&?]*)/;
const imgRegex = /.+\/(.+\.(?:jpg|gif|bmp|png|jpeg))(?:\?.*)?$/i;

export function isValidUrl(url = '') {
    const regex = /^https?:\/\//i;
    return regex.test(url);
}

export function stripTrailingSlashes(url = '') {
    return url.trim().replace(/\/+$/, '');
}

export function removeProtocol(url = '') {
    return url.replace(/(^\w+:|^)\/\//, '');
}

export function extractFirstLink(text) {
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

export function isYoutubeLink(link) {
    return link.trim().match(ytRegex);
}

export function isImageLink(link) {
    const match = link.trim().match(imgRegex);
    return Boolean(match && match[1]);
}

// Converts the protocol of a link (eg. http, ftp) to be lower case since
// Android doesn't handle uppercase links.
export function normalizeProtocol(url) {
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

export function cleanUpUrlable(input) {
    var cleaned = latinise(input);
    cleaned = cleaned.trim().replace(/-/g, ' ').replace(/[^\w\s]/gi, '').toLowerCase().replace(/\s/g, '-');
    cleaned = cleaned.replace(/-{2,}/, '-');
    cleaned = cleaned.replace(/^-+/, '');
    cleaned = cleaned.replace(/-+$/, '');
    return cleaned;
}
