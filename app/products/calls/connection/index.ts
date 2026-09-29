// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CallsTransport, type CallsConfigState} from '@calls/types/calls';
import {getCallsTransport} from '@calls/utils';

import {newLiveKitConnection} from './livekit/connection';
import {newRtcdConnection} from './rtcd/connection';

import type {IntlShape} from 'react-intl';

export function newCallConnection(
    serverUrl: string,
    channelID: string,
    closeCb: (err?: Error) => void,
    setScreenShareURL: (url: string) => void,
    hasMicPermission: boolean,
    intl: IntlShape,
    config: CallsConfigState,
    title?: string,
    rootId?: string,
) {
    const connect = getCallsTransport(config) === CallsTransport.LiveKit ? newLiveKitConnection : newRtcdConnection;

    return connect(serverUrl, channelID, closeCb, setScreenShareURL, hasMicPermission, intl, title, rootId);
}
