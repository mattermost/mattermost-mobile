// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ServerDataOperatorBase from '@database/operator/server_data_operator/handlers';
import CategoryHandler, {CategoryHandlerMix} from '@database/operator/server_data_operator/handlers/category';
import ChannelHandler, {ChannelHandlerMix} from '@database/operator/server_data_operator/handlers/channel';
import PostHandler, {PostHandlerMix} from '@database/operator/server_data_operator/handlers/post';
import PostsInChannelHandler, {PostsInChannelHandlerMix} from '@database/operator/server_data_operator/handlers/posts_in_channel';
import PostsInThreadHandler, {PostsInThreadHandlerMix} from '@database/operator/server_data_operator/handlers/posts_in_thread';
import TeamHandler, {TeamHandlerMix} from '@database/operator/server_data_operator/handlers/team';
import UserHandler, {UserHandlerMix} from '@database/operator/server_data_operator/handlers/user';
import mix from '@utils/mix';

import type {Database} from '@nozbe/watermelondb';

interface ServerDataOperator extends ServerDataOperatorBase, PostHandlerMix, PostsInChannelHandlerMix,
    PostsInThreadHandlerMix, UserHandlerMix, ChannelHandlerMix, CategoryHandlerMix, TeamHandlerMix {}

class ServerDataOperator extends mix(ServerDataOperatorBase).with(
    CategoryHandler,
    ChannelHandler,
    PostHandler,
    PostsInChannelHandler,
    PostsInThreadHandler,
    TeamHandler,
    UserHandler,
) {
    // eslint-disable-next-line no-useless-constructor
    constructor(database: Database) {
        super(database);
    }
}

export default ServerDataOperator;
