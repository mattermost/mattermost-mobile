// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ServerDataOperator, {ServerDataOperatorMix} from '@database/operator/server_data_operator/handlers';
import ChannelHandler, {ChannelHandlerMix} from '@database/operator/server_data_operator/handlers/channel';
import GroupHandler, {GroupHandlerMix} from '@database/operator/server_data_operator/handlers/group';
import PostHandler, {PostHandlerMix} from '@database/operator/server_data_operator/handlers/post';
import TeamHandler, {TeamHandlerMix} from '@database/operator/server_data_operator/handlers/team';
import UserHandler, {UserHandlerMix} from '@database/operator/server_data_operator/handlers/user';
import {DatabaseInstance} from '@typings/database/database';
import mix from '@utils/mix';

interface Operator extends ServerDataOperatorMix, PostHandlerMix, UserHandlerMix, GroupHandlerMix, ChannelHandlerMix, TeamHandlerMix {}

class Operator extends mix(ServerDataOperator).with(PostHandler, UserHandler, GroupHandler, ChannelHandler, TeamHandler) {
    database: DatabaseInstance;

    constructor(activeDatabase?: DatabaseInstance) {
        super();
        if (activeDatabase) {
            this.activeDatabase = activeDatabase;
        }
    }
}

export default Operator;
