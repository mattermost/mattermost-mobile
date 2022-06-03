// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useEffect} from 'react';
import {Navigation} from 'react-native-navigation';

import {CopyPermalinkOption, FollowThreadOption, ReplyOption, SaveOption} from '@components/common_post_options';
import {ITEM_HEIGHT} from '@components/menu_item';
import {Screens} from '@constants';
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

    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                switch (buttonId) {
                    case 'close-post-options': {
                        dismissModal({componentId});
                        break;
                    }
                }
            },
        }, componentId);

        return () => {
            unsubscribe.remove();
        };
    }, []);

    const isSystemPost = isSystemMessage(post);

    const canCopyPermalink = !isSystemPost && managedConfig?.copyAndPasteProtection !== 'true';
    const canCopyText = canCopyPermalink && post.message;

    const shouldRenderFollow = !(sourceScreen !== Screens.CHANNEL || !thread);

    const snapPoints = [
        canAddReaction, canCopyPermalink, canCopyText,
        canDelete, canEdit, shouldRenderFollow,
        canMarkAsUnread, canPin, canReply, !isSystemPost,
    ].reduce((acc, v) => {
        return v ? acc + 1 : acc;
    }, 0);

    const renderContent = () => {
        return (
            <>
                {canAddReaction && <ReactionBar postId={post.id}/>}
                {canReply && sourceScreen !== Screens.THREAD && <ReplyOption post={post}/>}
                {shouldRenderFollow &&
                    <FollowThreadOption thread={thread}/>
                }
                {canMarkAsUnread && !isSystemPost &&
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
                {Boolean(canCopyText && post.message) &&
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
                {canEdit &&
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

    const additionalSnapPoints = 2;

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId='close-post-options'
            componentId={Screens.POST_OPTIONS}
            initialSnapIndex={0}
            snapPoints={[((snapPoints + additionalSnapPoints) * ITEM_HEIGHT), 10]}
            testID='post_options'
        />
    );
};

export default PostOptions;
