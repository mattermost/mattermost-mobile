// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface launchAppFunc {
    (skipEmm: boolean): void;
}

interface GlobalEventHandlerOpts {
    launchApp: launchAppFunc;
}
