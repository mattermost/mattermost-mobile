// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ServerDataOperatorBase from '@database/operator/server_data_operator/handlers';
import CategoryHandler, {type CategoryHandlerMix} from '@database/operator/server_data_operator/handlers/category';
import ChannelHandler, {type ChannelHandlerMix} from '@database/operator/server_data_operator/handlers/channel';
import GroupHandler, {type GroupHandlerMix} from '@database/operator/server_data_operator/handlers/group';
import PostHandler, {type PostHandlerMix} from '@database/operator/server_data_operator/handlers/post';
import TeamHandler, {type TeamHandlerMix} from '@database/operator/server_data_operator/handlers/team';
import TeamThreadsSyncHandler, {type TeamThreadsSyncHandlerMix} from '@database/operator/server_data_operator/handlers/team_threads_sync';
import ThreadHandler, {type ThreadHandlerMix} from '@database/operator/server_data_operator/handlers/thread';
import UserHandler, {type UserHandlerMix} from '@database/operator/server_data_operator/handlers/user';
import mix from '@utils/mix';

import type {Database} from '@nozbe/watermelondb';

interface ServerDataOperator extends
    CategoryHandlerMix,
    ChannelHandlerMix,
    GroupHandlerMix,
    PostHandlerMix,
    ServerDataOperatorBase,
    TeamHandlerMix,
    ThreadHandlerMix,
    TeamThreadsSyncHandlerMix,
    UserHandlerMix
{}

class ServerDataOperator extends mix(ServerDataOperatorBase).with(
    CategoryHandler,
    ChannelHandler,
    GroupHandler,
    PostHandler,
    TeamHandler,
    ThreadHandler,
    TeamThreadsSyncHandler,
    UserHandler,
) {
    // eslint-disable-next-line no-useless-constructor
    constructor(database: Database) {
        super(database);
    }
}

export default ServerDataOperator;
