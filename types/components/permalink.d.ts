// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PermalinkErrorType = {
    unreachable?: boolean;
    notExist?: boolean;
    joinedTeam?: boolean;
    privateChannel?: boolean;
    privateTeam?: boolean;
    teamName?: string;
    channelName?: string;
    teamId?: string;
    channelId?: string;
}
