// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionResult} from '@mm-redux/types/actions';

export interface SendEphemeralPost {
    (message: string, channelId?: string, parentId?: string, userId?: string): Promise<ActionResult>;
}
