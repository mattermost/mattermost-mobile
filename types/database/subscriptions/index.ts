// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Subscription} from 'rxjs';

export type UnreadMessages = {
    mentions: number;
    unread: boolean;
};

export type UnreadSubscription = UnreadMessages & {
    subscription?: Subscription;
};
