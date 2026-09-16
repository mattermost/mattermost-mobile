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
 *
 * Sized from measurement, not taste: in run 35095465913 a live holder renewed its lease for
 * ~24 minutes, so the previous 20-minute budget could not outlast even one legitimate hold
 * and login_mfa MM-T3181 failed on the acquire. Shard jobs allow 180 min (iOS) / 150 min
 * (Android) and the shard in question used 37, so 40 leaves ample headroom.
 *
 * Note this only widens the window — acquireLock is not FIFO, so a waiter can still be
 * overtaken by a later arrival (MM-T3181 started waiting at 12:52:54 and was passed by an
 * owner that first tried at 12:54:03). Curing that needs a fair queue or all three SITE_3
 * suites pinned to one shard.
 */
export const SITE_THREE_LOCK_TIMEOUT_MS = timeouts.ONE_MIN * 40;
