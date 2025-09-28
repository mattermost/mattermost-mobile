// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {handleDeepLink, matchDeepLink} from '@utils/deep_link';

import {isValidAppSchemeUrl, normalizeProtocol, tryOpenURL} from '.';

import type {IntlShape} from 'react-intl';

export const onOpenLinkError = (intl: IntlShape) => {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.link.error.title',
            defaultMessage: 'Error',
        }),
        intl.formatMessage({
            id: 'mobile.link.error.text',
            defaultMessage: 'Unable to open the link.',
        }),
    );
};

export const openLink = async (link: string, serverUrl: string, siteURL: string, intl: IntlShape) => {
    const url = normalizeProtocol(link);
    if (!url) {
        return;
    }

    // For app scheme URLs, try deep link handling first
    if (isValidAppSchemeUrl(url)) {
        const match = matchDeepLink(url, serverUrl, siteURL);
        if (match) {
            const {error} = await handleDeepLink(match, intl);
            if (!error) {
                return;
            }
        }
        // If deep link handling fails, try to open the URL directly
        tryOpenURL(url, () => onOpenLinkError(intl));
        return;
    }

    const match = matchDeepLink(url, serverUrl, siteURL);

    if (match) {
        const {error} = await handleDeepLink(match, intl);
        if (error) {
            tryOpenURL(match.url, () => onOpenLinkError(intl));
        }
    } else {
        tryOpenURL(url, () => onOpenLinkError(intl));
    }
};
