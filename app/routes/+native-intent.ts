// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeepLink, Sso} from '@constants';
import {DEFAULT_LOCALE} from '@i18n';
import {alertInvalidDeepLink, parseAndHandleDeepLink, parseDeepLink} from '@utils/deep_link';
import {getIntlShape} from '@utils/general';

/**
 * Custom native intent for expo-router (see Expo `NativeIntent` / `+native-intent`).
 *
 * Only `redirectSystemPath` and `legacy_subscribe` are used by expo-router; a plain
 * `addEventListener` export is ignored. Without `redirectSystemPath`, URLs such as
 * `mattermost://incoming-call?...` are treated as file routes, which shows "Unmatched Route".
 */

export async function redirectSystemPath(options: {path: string; initial: boolean}): Promise<string | null> {
    const {path} = options;
    if (!path) {
        return path;
    }
    if (path.startsWith(Sso.REDIRECT_URL_SCHEME) ||
        path.startsWith(Sso.REDIRECT_URL_SCHEME_DEV)) {
        return path;
    }

    const parsed = parseDeepLink(path, true);
    if (parsed.type === DeepLink.CallsIncoming) {
        const {error} = await parseAndHandleDeepLink(path, undefined, undefined, true);
        if (error) {
            alertInvalidDeepLink(getIntlShape(DEFAULT_LOCALE));
        }
        return null;
    }

    return path;
}
