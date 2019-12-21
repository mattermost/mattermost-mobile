// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Channel, ChannelMember} from './channel';
import ClientUpgrade from './client_upgrade';
import {Emoji, NonExistentEmoji} from './emoji';
import General from './general';
import {Embed, File, ImageMetadata, Reaction, Post, PostsTimesInChannel} from './post';
import Preference from './preference';
import Role from './role';
import {Team, TeamMember} from './team';
import User from './user';

export default [
    Channel,
    ChannelMember,
    ClientUpgrade,
    Embed,
    Emoji,
    File,
    General,
    ImageMetadata,
    NonExistentEmoji,
    Post,
    PostsTimesInChannel,
    Preference,
    Reaction,
    Role,
    Team,
    TeamMember,
    User,
];
