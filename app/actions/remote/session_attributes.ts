// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const fetchSessionAttributesManifest = async (serverUrl: string): Promise<{manifest?: SAField[]; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const manifest = await client.getSessionAttributesManifest();
        return {manifest};
    } catch (error) {
        logDebug('error on fetchSessionAttributesManifest', getFullErrorMessage(error));
        return {error};
    }
};
