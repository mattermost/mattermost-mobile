// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import * as Screens from '@constants/screens';
import {isSystemMessage} from '@utils/post';

import CopyLinkOption from './copy_link_option';
import CopyTextOption from './copy_text_option';
import DeletePostOption from './delete_post_option';
import EditOption from './edit_option';
import FollowThreadOption from './follow_option';
import MarkAsUnreadOption from './mark_unread_option';
import PinChannelOption from './pin_channel_option';
import ReplyOption from './reply_option';
import SaveOption from './save_option';

import type PostModel from '@typings/database/models/servers/post';

//fixme: should this be even a screen ??
//fixme: some props are optional - review them

type PostOptionsProps = {
    canCopyPermalink?: boolean;
    canCopyText?: boolean;
    canDelete?: boolean;
    canEdit?: boolean;
    canEditUntil?: number;
    canFlag?: boolean;
    canMarkAsUnread?: boolean;
    canPin?: boolean;
    isFlagged?: boolean;
    location: typeof Screens[keyof typeof Screens] | string;
    post: PostModel;
};

//todo: look up the permission here and render each option accordingly
const PostOptions = ({
    canCopyPermalink = true,
    canCopyText = true,
    canDelete = true,
    canEdit = true,
    canEditUntil = -1,
    canFlag = true,
    canMarkAsUnread = true,
    canPin = true,
    isFlagged = true,
    location,
    post,
}: PostOptionsProps) => {
    const shouldRenderEdit = canEdit && (canEditUntil === -1 || canEditUntil > Date.now());
    return (
        <View>
            <ReplyOption/>
            <FollowThreadOption

                location={location}
            />
            {canMarkAsUnread && !isSystemMessage(post) && (
                <MarkAsUnreadOption/>
            )}
            {canCopyPermalink && <CopyLinkOption/>}
            {canFlag &&
                <SaveOption
                    isFlagged={isFlagged}
                />
            }
            {canCopyText && <CopyTextOption/>}
            {canPin && <PinChannelOption isPostPinned={post.isPinned}/>}
            {shouldRenderEdit && <EditOption/>}
            {canDelete && <DeletePostOption/>}
        </View>
    );
};

export default PostOptions;
