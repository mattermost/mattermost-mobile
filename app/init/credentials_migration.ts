// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storePreauthSecretMigrationDone} from '@actions/app/global';
import {getLegacyPreauthSecret, getPreauthSecret, removeLegacyPreauthSecret, setPreauthSecret} from '@init/credentials';
import {getPreauthSecretMigrationDone} from '@queries/app/global';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logWarning} from '@utils/log';

/**
 * MM-70605 (https://mattermost.atlassian.net/browse/MM-70605): adopts the legacy shared pre-auth secret
 * into the per-server entry only when exactly one server row exists (active or inactive); otherwise discards it.
 * If the JS share bundle ever runs on iOS this must be gated to the main app (legacy lookup falls back to the running bundle identifier).
 */
export async function migrateLegacyPreauthSecret(serverUrls: string[]): Promise<void> {
    try {
        if (await getPreauthSecretMigrationDone()) {
            return;
        }

        // Throws on keychain errors; the outer catch leaves the flag unset so we retry later.
        const legacySecret = await getLegacyPreauthSecret();
        if (!legacySecret) {
            await markMigrationDone();
            return;
        }

        if (serverUrls.length !== 1) {
            logDebug('migrateLegacyPreauthSecret: discarding an unattributable secret', {servers: serverUrls.length});
            await removeLegacyPreauthSecret();
            await markMigrationDone();
            return;
        }

        const targetServerUrl = serverUrls[0];

        // A previous run may have stored the secret and failed before clearing the legacy entry or marking done; keep what is stored.
        const existing = await getPreauthSecret(targetServerUrl);

        // Only destroy the legacy copy once the new one is confirmed stored, otherwise a failed
        // keystore write would lose the user's only copy of the secret.
        if (!existing && !await setPreauthSecret(targetServerUrl, legacySecret)) {
            logWarning('migrateLegacyPreauthSecret: could not store the secret, keeping the legacy entry');
            return;
        }

        await removeLegacyPreauthSecret();
        await markMigrationDone();
        logDebug('migrateLegacyPreauthSecret: migrated');
    } catch (e) {
        // Leaving the flag unset retries the migration on the next launch.
        logWarning('migrateLegacyPreauthSecret: failed', getFullErrorMessage(e));
    }
}

async function markMigrationDone() {
    const result = await storePreauthSecretMigrationDone();
    if (result && typeof result === 'object' && 'error' in result && result.error) {
        throw result.error;
    }
}
