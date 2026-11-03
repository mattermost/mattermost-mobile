// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CallsTransport} from '@calls/types/calls';
import {logDebug} from '@utils/log';

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
    transport: CallsTransport,
    title?: string,
    rootId?: string,
) {
    logDebug('calls: using transport', transport);

    const connect = transport === CallsTransport.LiveKit ? newLiveKitConnection : newRtcdConnection;

    return connect(serverUrl, channelID, closeCb, setScreenShareURL, hasMicPermission, intl, title, rootId);
}
