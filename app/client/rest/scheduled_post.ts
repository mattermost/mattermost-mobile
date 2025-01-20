// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from '@client/rest/base';

export interface ClientScheduledPostMix {
    createScheduledPost(schedulePost: ScheduledPost, connectionId: string):
}

const ClientScheduledPost = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    createScheduledPost
}
