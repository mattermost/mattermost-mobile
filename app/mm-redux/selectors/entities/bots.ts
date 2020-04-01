// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GlobalState} from '@mm-redux/types/store';

export function getBotAccounts(state: GlobalState) {
    return state.entities.bots.accounts;
}
