// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storePreauthSecretMigrationDone} from '@actions/app/global';
import {getLegacyPreauthSecret, getPreauthSecret, removeLegacyPreauthSecret, setPreauthSecret} from '@init/credentials';
import {getPreauthSecretMigrationDone} from '@queries/app/global';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logWarning} from '@utils/log';

/**
 * Moves the pre-MM-70605 pre-auth secret into its per-server entry.
 *
 * Every server used to share one keychain entry, so the stored value belongs to whichever server
 * wrote it last, which is not knowable afterwards. It is therefore adopted only when a single server
 * makes ownership unambiguous; with more than one, the entry is discarded and every server
 * re-prompts. Guessing an owner would send one operator's secret to a host it was never meant for,
 * which is the bug being fixed.
 *
 * Runs in the Android share extension too, which is harmless: it shares the process, alias space and
 * app database with the main app, and the iOS share and notification extensions are native readers
 * that never execute this. If the JS share bundle is ever enabled on iOS this must be gated to the
 * main app, because the legacy lookup falls back to the running bundle's identifier there and would
 * mark the migration done against an entry it cannot see.
 *
 * @param activeServerUrls URLs of DB-active servers (empty, one, or many).
 */
export async function migrateLegacyPreauthSecret(activeServerUrls: string[]): Promise<void> {
    try {
        if (await getPreauthSecretMigrationDone()) {
            return;
        }

        // Throws on keychain errors; the outer catch leaves the flag unset so we retry later.
        const legacySecret = await getLegacyPreauthSecret();
        if (!legacySecret) {
            await storePreauthSecretMigrationDone();
            return;
        }

        if (!activeServerUrls.length) {
            // No server can own the secret yet. Keep it and retry on a later launch rather than
            // destroying the only copy a user part-way through onboarding has.
            logDebug('migrateLegacyPreauthSecret: no active server, deferring');
            return;
        }

        if (activeServerUrls.length > 1) {
            logDebug('migrateLegacyPreauthSecret: discarding an unattributable secret', {servers: activeServerUrls.length});
            await removeLegacyPreauthSecret();
            await storePreauthSecretMigrationDone();
            return;
        }

        const targetServerUrl = activeServerUrls[0];

        // A deferred run can be followed by the user entering a new secret, which must win.
        const existing = await getPreauthSecret(targetServerUrl);

        // Only destroy the legacy copy once the new one is confirmed stored, otherwise a failed
        // keystore write would lose the user's only copy of the secret.
        if (!existing && !await setPreauthSecret(targetServerUrl, legacySecret)) {
            logWarning('migrateLegacyPreauthSecret: could not store the secret, keeping the legacy entry');
            return;
        }

        await removeLegacyPreauthSecret();
        await storePreauthSecretMigrationDone();
        logDebug('migrateLegacyPreauthSecret: migrated');
    } catch (e) {
        // Leaving the flag unset retries the migration on the next launch.
        logWarning('migrateLegacyPreauthSecret failed', getFullErrorMessage(e));
    }
}
