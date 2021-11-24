// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ClientResponse, ClientResponseError} from '@mattermost/react-native-network-client';

import {Client} from '@app/client/rest';
import ClientError from '@app/client/rest/error';
import NetworkManager from '@init/network_manager';

export const uploadFile = (
    serverUrl: string,
    file: FileInfo,
    channelId: string,
    onProgress: (fractionCompleted: number) => void,
    onComplete: (response: ClientResponse) => void,
    onError: (response: ClientResponseError) => void,
) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error: error as ClientError};
    }
    return {cancel: client.uploadFile(file, channelId, onProgress, onComplete, onError)};
};
