// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import WebsocketManager from '@managers/websocket_manager';

import OutOfDateHeader from './out_of_date_header';

const enhanced = withObservables(['serverUrl'], ({serverUrl}: {serverUrl: string}) => ({
    websocketState: WebsocketManager.observeWebsocketState(serverUrl),
}));

export default withDatabase(enhanced(OutOfDateHeader));
