// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React from 'react';

import {CopyPermalinkOption, FollowThreadOption, ReplyOption, SaveOption} from '@components/common_post_options';
import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {PostTypes} from '@constants/post';
import {REACTION_PICKER_HEIGHT} from '@constants/reaction_picker';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import BottomSheet from '@screens/bottom_sheet';
import {dismissModal} from '@screens/navigation';
import {isSystemMessage} from '@utils/post';

import CopyTextOption from './options/copy_text_option';
import DeletePostOption from './options/delete_post_option';
import EditOption from './options/edit_option';
import MarkAsUnreadOption from './options/mark_unread_option';
import PinChannelOption from './options/pin_channel_option';
import ReactionBar from './reaction_bar';

import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';

const POST_OPTIONS_BUTTON = 'close-post-options';

type PostOptionsProps = {
    canAddReaction: boolean;
    canDelete: boolean;
    canEdit: boolean;
    canMarkAsUnread: boolean;
    canPin: boolean;
    canReply: boolean;
    combinedPost?: Post | PostModel;
    isSaved: boolean;
    sourceScreen: typeof Screens[keyof typeof Screens];
    post: PostModel;
    thread?: ThreadModel;
    componentId: string;
};
const PostOptions = ({
    canAddReaction, canDelete, canEdit,
    canMarkAsUnread, canPin, canReply,
    combinedPost, componentId, isSaved,
    sourceScreen, post, thread,
}: PostOptionsProps) => {
    const managedConfig = useManagedConfig<ManagedConfig>();

    const close = () => {
        dismissModal({componentId});
    };

    useNavButtonPressed(POST_OPTIONS_BUTTON, componentId, close, []);

    const isSystemPost = isSystemMessage(post);

    const canCopyPermalink = !isSystemPost && managedConfig?.copyAndPasteProtection !== 'true';
    const canCopyText = canCopyPermalink && post.message;

    const shouldRenderFollow = !(sourceScreen !== Screens.CHANNEL || !thread);
    const shouldRenderReply = canReply && sourceScreen !== Screens.THREAD;
    const shouldRenderMarkAsUnread = canMarkAsUnread && !isSystemPost;
    const shouldRenderCopyText = Boolean(canCopyText && post.message);
    const shouldRenderEdit = canEdit && post.type !== PostTypes.VOICE_MESSAGE;

    const snapPoints = [
        shouldRenderReply,
        shouldRenderFollow,
        shouldRenderMarkAsUnread,
        canCopyPermalink,
        !isSystemPost,
        shouldRenderCopyText,
        canPin,
        shouldRenderEdit,
        canDelete,
    ].reduce((acc, v) => {
        return v ? acc + 1 : acc;
    }, 0);

    const renderContent = () => {
        return (
            <>
                {canAddReaction && <ReactionBar postId={post.id}/>}
                {shouldRenderReply && <ReplyOption post={post}/>}
                {shouldRenderFollow &&
                    <FollowThreadOption thread={thread}/>
                }
                {shouldRenderMarkAsUnread &&
                    <MarkAsUnreadOption
                        post={post}
                        sourceScreen={sourceScreen}
                    />
                }
                {canCopyPermalink &&
                    <CopyPermalinkOption
                        post={post}
                        sourceScreen={sourceScreen}
                    />
                }
                {!isSystemPost &&
                    <SaveOption
                        isSaved={isSaved}
                        postId={post.id}
                    />
                }
                {shouldRenderCopyText &&
                    <CopyTextOption
                        postMessage={post.message}
                        sourceScreen={sourceScreen}
                    />}
                {canPin &&
                    <PinChannelOption
                        isPostPinned={post.isPinned}
                        postId={post.id}
                    />
                }
                {shouldRenderEdit &&
                    <EditOption
                        post={post}
                        canDelete={canDelete}
                    />
                }
                {canDelete &&
                <DeletePostOption
                    combinedPost={combinedPost}
                    post={post}
                />}
            </>
        );
    };

    const additionalSnapPoints = 1;

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={POST_OPTIONS_BUTTON}
            componentId={Screens.POST_OPTIONS}
            initialSnapIndex={0}
            snapPoints={[(((snapPoints + additionalSnapPoints) * ITEM_HEIGHT) + (canAddReaction ? REACTION_PICKER_HEIGHT : 0)), 10]}
            testID='post_options'
        />
    );
};

export default PostOptions;
