// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import * as Screens from '@constants/screens';
import {useTheme} from '@context/theme';
import {isSystemMessage} from '@utils/post';

import CopyLinkOption from './copy_link_option';
import CopyTextOption from './copy_text_option';
import FollowThreadOption from './follow_option';
import MarkAsUnreadOption from './mark_unread_option';
import ReplyOption from './reply_option';
import SaveOption from './save_option';

import type PostModel from '@typings/database/models/servers/post';

//fixme: should this be even a screen ??
//fixme: some props are optional - review them

type PostOptionsProps = {
    location: typeof Screens[keyof typeof Screens];
    post: PostModel;
    canMarkAsUnread?: boolean;
    canCopyText?: boolean;
    canCopyPermalink?: boolean;
    canFlag?: boolean;
    isFlagged?: boolean;
};

//todo: look up the permission here and render each option accordingly
const PostOptions = ({
    location,
    post,
    canMarkAsUnread = true,
    canCopyText = true,
    canCopyPermalink = true,
    canFlag = true,
    isFlagged = true,
}: PostOptionsProps) => {
    const theme = useTheme();
    return (
        <View>
            <ReplyOption theme={theme}/>
            <FollowThreadOption
                theme={theme}
                location={location}
            />
            {canMarkAsUnread && !isSystemMessage(post) && (
                <MarkAsUnreadOption theme={theme}/>
            )}
            {canCopyPermalink && <CopyLinkOption theme={theme}/>}
            {canFlag &&
                <SaveOption
                    theme={theme}
                    isFlagged={isFlagged}
                />
            }
            {canCopyText && <CopyTextOption theme={theme}/>}
        </View>
    );
};

export default PostOptions;
