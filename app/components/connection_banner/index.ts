// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';

import {withServerUrl} from '@context/server';
import websocket_manager from '@managers/websocket_manager';

import ConnectionBanner from './connection_banner';

const enhanced = withObservables(['serverUrl'], ({serverUrl}: {serverUrl: string}) => ({
    websocketState: websocket_manager.observeWebsocketState(serverUrl),
}));

export default withServerUrl(enhanced(ConnectionBanner));
