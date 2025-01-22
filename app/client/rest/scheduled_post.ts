// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from '@client/rest/base';

export interface ClientScheduledPostMix {
    createScheduledPost(schedulePost: ScheduledPost, connectionId?: string): Promise<ScheduledPost>;
}

const ClientScheduledPost = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    createScheduledPost = async (schedulePost: ScheduledPost, connectionId?: string) => {
        console.log('XXXXXXXXXXXXXXXXXXXXXXXX');

        const x = this.doFetch(
            this.getScheduledPostRoute(),
            {
                method: 'post',
                body: schedulePost,
                headers: {'Connection-Id': connectionId},
            },
        );

        console.log({x});
        return x;
    };
};

export default ClientScheduledPost;
