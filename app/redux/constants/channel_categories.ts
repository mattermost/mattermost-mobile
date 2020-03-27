// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelCategoryType} from 'types/channel_categories';

export const CategoryTypes: {[name: string]: ChannelCategoryType} = {
    FAVORITES: 'favorites',
    PUBLIC: 'public',
    PRIVATE: 'private',
    DIRECT_MESSAGES: 'direct_messages',
    CUSTOM: 'custom',
};
