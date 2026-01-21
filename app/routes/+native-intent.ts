// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';

import {Sso} from '@constants';
import {DEFAULT_LOCALE} from '@i18n';
import {alertInvalidDeepLink, parseAndHandleDeepLink} from '@utils/deep_link';
import {getIntlShape} from '@utils/general';

/**
 * Custom native intent handler for expo-router
 * This replaces expo-router's default deep link handling with our custom logic
 *
 * Expo-router will use this instead of setting up its own Linking.addEventListener
 * This prevents the "multiple linking configurations" error
 */

/**
 * Set up custom deep link event listener
 * Expo-router calls this function to subscribe to URL events
 */
export const addEventListener = () => {
    // Set up our custom deep link listener
    const handleUrl = async (event: {url: string}) => {
        // Ignore SSO redirect URLs
        if (event.url?.startsWith(Sso.REDIRECT_URL_SCHEME) ||
            event.url?.startsWith(Sso.REDIRECT_URL_SCHEME_DEV)) {
            return;
        }

        if (event.url) {
            const {error} = await parseAndHandleDeepLink(
                event.url,
                undefined,
                undefined,
                true,
            );

            if (error) {
                alertInvalidDeepLink(getIntlShape(DEFAULT_LOCALE));
            }
        }
    };

    // Subscribe to URL events
    const subscription = Linking.addEventListener('url', handleUrl);

    // Return unsubscribe function
    return () => {
        subscription.remove();
    };
};

/**
 * Optional: Redirect system paths if needed
 * We don't need custom redirection, so just return the path as-is
 */
export function redirectSystemPath(options: {path: string; initial: boolean}) {
    return options.path;
}
