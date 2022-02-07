// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ClientResponse, ClientResponseError} from '@mattermost/react-native-network-client';

import {Client} from '@client/rest';
import ClientError from '@client/rest/error';
import NetworkManager from '@init/network_manager';

export const uploadFile = (
    serverUrl: string,
    file: FileInfo,
    channelId: string,
    onProgress: (fractionCompleted: number, bytesRead?: number | null | undefined) => void = () => {/*Do Nothing*/},
    onComplete: (response: ClientResponse) => void = () => {/*Do Nothing*/},
    onError: (response: ClientResponseError) => void = () => {/*Do Nothing*/},
    skipBytes = 0,
) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error: error as ClientError};
    }
    return {cancel: client.uploadPostAttachment(file, channelId, onProgress, onComplete, onError, skipBytes)};
};
