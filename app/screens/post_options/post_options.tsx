// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ITEM_HEIGHT} from '@components/menu_item';
import {Screens} from '@constants';
import BottomSheet from '@screens/bottom_sheet';
import {isSystemMessage} from '@utils/post';

import CopyLinkOption from './components/options/copy_link_option';
import CopyTextOption from './components/options/copy_text_option';
import DeletePostOption from './components/options/delete_post_option';
import EditOption from './components/options/edit_option';
import FollowThreadOption from './components/options/follow_option';
import MarkAsUnreadOption from './components/options/mark_unread_option';
import PinChannelOption from './components/options/pin_channel_option';
import ReplyOption from './components/options/reply_option';
import SaveOption from './components/options/save_option';
import ReactionBar from './components/reaction_bar';

import type PostModel from '@typings/database/models/servers/post';

//fixme: some props are optional - review them

type PostOptionsProps = {
    canAddReaction?: boolean;
    canCopyPermalink?: boolean;
    canCopyText?: boolean;
    canDelete?: boolean;
    canEdit?: boolean;
    canEditUntil?: number;
    canMarkAsUnread?: boolean;
    canPin?: boolean;
    canSave?: boolean;
    canReply?: boolean;
    isSaved?: boolean;
    location: typeof Screens[keyof typeof Screens];
    post: PostModel;
    thread?: Partial<PostModel>;
};

const PostOptions = ({
    canAddReaction = true,
    canCopyPermalink = true,
    canCopyText = true,
    canDelete = true,
    canEdit = true,
    canEditUntil = -1,
    canMarkAsUnread = true,
    canPin = true,
    canReply = true,
    canSave = true,
    isSaved = true,
    location,
    post,
    thread,
}: PostOptionsProps) => {
    const shouldRenderEdit = canEdit && (canEditUntil === -1 || canEditUntil > Date.now());
    const shouldRenderFollow = !(location !== Screens.CHANNEL || !thread);

    const snapPoints = [
        canAddReaction, canCopyPermalink, canCopyText,
        canDelete, shouldRenderEdit, shouldRenderFollow,
        canMarkAsUnread, canPin, canReply, canSave,
    ].reduce((acc, v) => {
        return v ? acc + 1 : acc;
    }, 0);

    const renderContent = () => {
        return (
            <>
                {canAddReaction && <ReactionBar/>}
                {canReply && <ReplyOption/>}
                {shouldRenderFollow &&
                    <FollowThreadOption
                        location={location}
                        thread={thread}
                    />
                }
                {canMarkAsUnread && !isSystemMessage(post) && (
                    <MarkAsUnreadOption/>
                )}
                {canCopyPermalink && <CopyLinkOption/>}
                {canSave &&
                    <SaveOption
                        isSaved={isSaved}
                    />
                }
                {canCopyText && <CopyTextOption/>}
                {canPin && <PinChannelOption isPostPinned={post.isPinned}/>}
                {shouldRenderEdit && <EditOption/>}
                {canDelete && <DeletePostOption/>}
            </>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId='close-post-options'
            initialSnapIndex={0}
            snapPoints={[((snapPoints + 2) * ITEM_HEIGHT), 10]}
        />
    );
};

export default PostOptions;
