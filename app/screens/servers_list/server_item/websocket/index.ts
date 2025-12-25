// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';

import WebsocketManager from '@managers/websocket_manager';

import WebSocket from './websocket';

const enhanced = withObservables(['serverUrl'], ({serverUrl}: {serverUrl: string}) => ({
    websocketState: WebsocketManager.observeWebsocketState(serverUrl),
}));

export default enhanced(WebSocket);
