// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Exclusive use of the third test site (SITE_3).
 *
 * SITE_3 is a single instance shared by the iOS and Android jobs, and the suites that use it
 * are not independent: `custom_terms_of_service` turns on server-wide custom ToS, which puts
 * a modal in front of every login on that server — including `server_list`'s login to the
 * third server. `login_mfa` also patches server-wide MFA on this site. Those suites therefore
 * hold this lock for as long as they are using SITE_3.
 *
 * Shared from one module so callers cannot drift onto different lock names, which
 * would silently stop serialising them.
 */

import {createServerLock} from '@support/server_lock';
import {timeouts} from '@support/utils';

export const siteThreeLock = createServerLock('site_three');

/**
 * Long enough for the other platform's job plus the other suite to finish and release, and
 * comfortably above the 5-minute lease so a live holder is never stolen from.
 * Callers must give their beforeAll hook a larger timeout than this.
 */
export const SITE_THREE_LOCK_TIMEOUT_MS = timeouts.ONE_MIN * 20;
