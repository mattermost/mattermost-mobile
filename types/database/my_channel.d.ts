// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
export default class MyChannel extends Model {
    static table: string;
    static associations: Associations;
    channelId: string;
    lastPostAt: number;
    lastViewedAt: number;
    mentionsCount: number;
    messageCount: number;
    roles: string;
}
