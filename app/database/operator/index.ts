// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import BaseHandler, {BaseHandlerMix} from '@database/operator/handlers/base_handler';
import ChannelHandler, {ChannelHandlerMix} from '@database/operator/handlers/channel';
import GroupHandler, {GroupHandlerMix} from '@database/operator/handlers/group';
import PostHandler, {PostHandlerMix} from '@database/operator/handlers/post';
import TeamHandler, {TeamHandlerMix} from '@database/operator/handlers/team';
import UserHandler, {UserHandlerMix} from '@database/operator/handlers/user';
import {DatabaseInstance} from '@typings/database/database';
import mix from '@utils/mix';

interface Operator extends BaseHandlerMix, PostHandlerMix, UserHandlerMix, GroupHandlerMix, ChannelHandlerMix, TeamHandlerMix {}

class Operator extends mix(BaseHandler).with(PostHandler, UserHandler, GroupHandler, ChannelHandler, TeamHandler) {
    database: DatabaseInstance;

    constructor(activeDatabase?: DatabaseInstance) {
        super();
        if (activeDatabase) {
            this.activeDatabase = activeDatabase;
        }
    }
}

export default Operator;
