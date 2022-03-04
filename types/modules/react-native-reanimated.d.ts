// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

declare module 'react-native-reanimated' {
    function makeRemote<T>(value: T): T;

    function useEvent<T, K>(
        handler: T,
        events: string[],
        rebuild: boolean,
    ): K;
}
