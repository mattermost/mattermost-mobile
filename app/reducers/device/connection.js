// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceTypes} from '@constants';

export default function connection(state = true, action) {
    switch (action.type) {
    case DeviceTypes.CONNECTION_CHANGED:
        return action.data;
    }

    return state;
}

