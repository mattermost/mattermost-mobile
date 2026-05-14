// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Augments the upstream OverlayOptions type with androidIgnoreTouchInside,
// which is added by our react-native-navigation patch.
import 'react-native-navigation';

declare module 'react-native-navigation' {
    interface OverlayOptions {
        androidIgnoreTouchInside?: boolean;
    }
}
