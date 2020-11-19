// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';

export default class Channel extends Model {
    static table = MM_TABLES.SERVER.CHANNEL
    static associations: Associations = {
        [MM_TABLES.SERVER.TEAM]: {type: 'belongs_to', key: 'team_id'},
    }

    @field('channel_id') channelId! : string
    @field('create_at') createAt! : number
    @field('creator_id') creatorId! : string
    @field('delete_at') deleteAt! : number
    @field('display_name') displayName! : string
    @field('is_group_constrained') isGroupConstrained! : boolean
    @field('name') name! : string
    @field('teamId') team_id! : string
    @field('type') type! : string
}
