// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type SectionListData} from 'react-native';

import type GroupModel from '@typings/database/models/servers/group';
import type UserModel from '@typings/database/models/servers/user';

export type SpecialMention = {
    completeHandle: string;
    id: string;
    defaultMessage: string;
}

export type UserMentionSections = Array<SectionListData<UserProfile|UserModel|GroupModel|SpecialMention>>;
