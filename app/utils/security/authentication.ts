// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm, {AuthenticationOutcome} from '@mattermost/react-native-emm';

import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {DEVICE_SECURED_RETRY_DELAY, type AuthenticationSource} from './constants';

export type DeviceSecuredResult = 'secured' | 'notSecured' | 'interrupted';

// Not an instanceof check: the error may cross a module boundary. Anything unrecognised is
// indeterminate, so an unexpected failure never destroys a session or closes the app.
export const getAuthenticationOutcome = (error: unknown): AuthenticationOutcome => {
    const outcome = (error as {outcome?: AuthenticationOutcome} | undefined)?.outcome;
    return outcome ?? AuthenticationOutcome.Indeterminate;
};

/**
 * Checks whether the device is secured, retrying once when the check cannot be performed.
 *
 * `interrupted` is not a verdict about the device: reporting it as unsecured would send the
 * caller down a destructive path. The probe is silent, so retrying to absorb the iOS
 * app-switcher animation costs the user nothing.
 */
export const probeDeviceSecured = async (source: AuthenticationSource): Promise<DeviceSecuredResult> => {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const secured = await Emm.isDeviceSecured();
            return secured ? 'secured' : 'notSecured';
        } catch (error) {
            logDebug(`${source}: Could not determine device security`, {attempt, reason: getFullErrorMessage(error)});
            if (attempt === 0) {
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, DEVICE_SECURED_RETRY_DELAY));
            }
        }
    }

    return 'interrupted';
};
