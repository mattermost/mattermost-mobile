// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type CallTarget, CallsTransport} from '@calls/types/calls';
import {logDebug} from '@utils/log';

import {newLiveKitConnection} from './livekit/connection';
import {newRtcdConnection} from './rtcd/connection';

import type {IntlShape} from 'react-intl';

export function newCallConnection(
    serverUrl: string,
    target: CallTarget,
    closeCb: (err?: Error) => void,
    onChannelResolved: (channelId: string) => Promise<void>,
    setScreenShareURL: (url: string) => void,
    hasMicPermission: boolean,
    intl: IntlShape,
    transport: CallsTransport,
    title?: string,
    rootId?: string,
) {
    logDebug('calls: using transport', transport);

    const connect = transport === CallsTransport.LiveKit ? newLiveKitConnection : newRtcdConnection;

    return connect(serverUrl, target, closeCb, onChannelResolved, setScreenShareURL, hasMicPermission, intl, title, rootId);
}
