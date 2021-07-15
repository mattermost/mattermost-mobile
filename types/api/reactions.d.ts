// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type Reaction = {
    id?: string;
    user_id: string;
    post_id: string;
    emoji_name: string;
    create_at: number;
};
