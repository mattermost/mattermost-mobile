// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface CommandResponse {
    goto_location?: string;
    trigger_id?: string;

    // Defined in the server, but not used in the client
    // response_type?: string;
    // text?: string;
    // username?: string;
    // channel_id?: string;
    // icon_url?: string;
    // type?: string;
    // props?: string;
    // skip_slack_parsing?: boolean;
    // attachments?: any[];
    // extra_responses?: any[];
}
