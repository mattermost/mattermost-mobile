// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {GlobalState} from '@mm-redux/types/store';

export function shouldProcessApps(state: GlobalState) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // TODO: Add feature branch and/or proxy state check
    return true;
}
