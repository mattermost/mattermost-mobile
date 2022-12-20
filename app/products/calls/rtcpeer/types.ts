// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RTCIceServer} from 'react-native-webrtc';

export type RTCPeerConfig = {
    iceServers: RTCIceServer[];
}
