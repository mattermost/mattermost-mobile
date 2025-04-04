// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// So that typescript doesn't complain about importing `@env` through react-native-dotenv
declare module '@env' {
    export const RUNNING_E2E: string;
}

declare module 'react-native-dotenv' {
    export const RUNNING_E2E: string;
}
