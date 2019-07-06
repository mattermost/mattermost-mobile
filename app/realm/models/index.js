// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Channel, ChannelMember} from './channel';
import Emoji from './emoji';
import General from './general';
import {Embed, File, ImageMetadata, Reaction, Post, PostsInChannel} from './post';
import Preference from './preference';
import Role from './role';
import {Team, TeamMember} from './team';
import User from './user';

export default [
    Channel,
    ChannelMember,
    Embed,
    Emoji,
    File,
    General,
    ImageMetadata,
    Post,
    PostsInChannel,
    Preference,
    Reaction,
    Role,
    Team,
    TeamMember,
    User,
];
