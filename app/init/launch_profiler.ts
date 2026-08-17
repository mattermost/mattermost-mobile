// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logInfo} from '@utils/log';

const origin = Date.now();

export function launchMark(stage: string, extra?: string) {
    const ms = Date.now() - origin;
    if (extra) {
        logInfo('LAUNCH', `+${ms}ms`, stage, extra);
    } else {
        logInfo('LAUNCH', `+${ms}ms`, stage);
    }
}
