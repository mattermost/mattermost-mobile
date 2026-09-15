// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removePreauthSecret, setPreauthSecret} from '@init/credentials';
import {getFullErrorMessage} from '@utils/errors';
import {logWarning} from '@utils/log';

/**
 * Puts the previously stored pre-auth secret back into the keychain after a save path
 * that already wrote a new value then failed to sync live clients.
 *
 * @returns whether the keychain write/clear succeeded.
 */
export async function restorePreviousPreauthSecret(serverUrl: string, previousSecret: string): Promise<boolean> {
    try {
        // Do not trim: rollback must restore the exact previously stored value.
        if (previousSecret) {
            return setPreauthSecret(serverUrl, previousSecret);
        }
        return removePreauthSecret(serverUrl);
    } catch (error) {
        logWarning('restorePreviousPreauthSecret: failed', getFullErrorMessage(error));
        return false;
    }
}
