// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ServerDataOperatorBase from '@database/operator/server_data_operator/handlers';
import CategoryHandler, {CategoryHandlerMix} from '@database/operator/server_data_operator/handlers/category';
import ChannelHandler, {ChannelHandlerMix} from '@database/operator/server_data_operator/handlers/channel';
import GroupHandler, {GroupHandlerMix} from '@database/operator/server_data_operator/handlers/group';
import PostHandler, {PostHandlerMix} from '@database/operator/server_data_operator/handlers/post';
import PostsInChannelHandler, {PostsInChannelHandlerMix} from '@database/operator/server_data_operator/handlers/posts_in_channel';
import PostsInThreadHandler, {PostsInThreadHandlerMix} from '@database/operator/server_data_operator/handlers/posts_in_thread';
import ReactionHander, {ReactionHandlerMix} from '@database/operator/server_data_operator/handlers/reaction';
import TeamHandler, {TeamHandlerMix} from '@database/operator/server_data_operator/handlers/team';
import ThreadHandler, {ThreadHandlerMix} from '@database/operator/server_data_operator/handlers/thread';
import ThreadInTeamHandler, {ThreadInTeamHandlerMix} from '@database/operator/server_data_operator/handlers/thread_in_team';
import UserHandler, {UserHandlerMix} from '@database/operator/server_data_operator/handlers/user';
import mix from '@utils/mix';

import type {Database} from '@nozbe/watermelondb';

interface ServerDataOperator extends
    CategoryHandlerMix,
    ChannelHandlerMix,
    GroupHandlerMix,
    PostHandlerMix,
    PostsInChannelHandlerMix,
    PostsInThreadHandlerMix,
    ReactionHandlerMix,
    ServerDataOperatorBase,
    TeamHandlerMix,
    ThreadHandlerMix,
    ThreadInTeamHandlerMix,
    UserHandlerMix
{}

class ServerDataOperator extends mix(ServerDataOperatorBase).with(
    CategoryHandler,
    ChannelHandler,
    GroupHandler,
    PostHandler,
    PostsInChannelHandler,
    PostsInThreadHandler,
    ReactionHander,
    TeamHandler,
    ThreadHandler,
    ThreadInTeamHandler,
    UserHandler,
) {
    // eslint-disable-next-line no-useless-constructor
    constructor(database: Database) {
        super(database);
    }
}

export default ServerDataOperator;
