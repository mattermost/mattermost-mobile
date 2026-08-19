// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Augments WebSocketClientInterface with sendBinary, which is an optional
// extension supported by newer versions of the native client.
import '@mattermost/react-native-network-client';

declare module '@mattermost/react-native-network-client' {
    interface WebSocketClientInterface {
        sendBinary?: (data: string) => void;
    }
}
