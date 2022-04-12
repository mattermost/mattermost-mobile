// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useEffect} from 'react';
import {Navigation} from 'react-native-navigation';

import {ITEM_HEIGHT} from '@components/menu_item';
import {Screens} from '@constants';
import BottomSheet from '@screens/bottom_sheet';
import {dismissModal} from '@screens/navigation';
import {isSystemMessage} from '@utils/post';

import CopyLinkOption from './options/copy_permalink_option';
import CopyTextOption from './options/copy_text_option';
import DeletePostOption from './options/delete_post_option';
import EditOption from './options/edit_option';
import FollowThreadOption from './options/follow_option';
import MarkAsUnreadOption from './options/mark_unread_option';
import PinChannelOption from './options/pin_channel_option';
import ReplyOption from './options/reply_option';
import SaveOption from './options/save_option';
import ReactionBar from './reaction_bar';

import type PostModel from '@typings/database/models/servers/post';

type PostOptionsProps = {
    canAddReaction: boolean;
    canDelete: boolean;
    canEdit: boolean;
    canMarkAsUnread: boolean;
    canPin: boolean;
    canReply: boolean;
    combinedPost?: Post;
    isSaved: boolean;
    location: typeof Screens[keyof typeof Screens];
    post: PostModel;
    thread: Partial<PostModel>;
    componentId: string;
};

const PostOptions = ({
    canAddReaction,
    canDelete,
    canEdit,
    canMarkAsUnread,
    canPin,
    canReply,
    combinedPost,
    componentId,
    isSaved,
    location,
    post,
    thread,
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

    const shouldRenderFollow = !(location !== Screens.CHANNEL || !thread);

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
                {canReply && <ReplyOption post={post}/>}
                {shouldRenderFollow &&
                    <FollowThreadOption
                        location={location}
                        thread={thread}
                    />
                }
                {canMarkAsUnread && !isSystemPost &&
                    <MarkAsUnreadOption postId={post.id}/>
                }
                {canCopyPermalink && <CopyLinkOption post={post}/>}
                {!isSystemPost &&
                    <SaveOption
                        isSaved={isSaved}
                        postId={post.id}
                    />
                }
                {Boolean(canCopyText && post.message) && <CopyTextOption postMessage={post.message}/>}
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

    // This fixes opening "post options modal" on top of "thread modal"
    const additionalSnapPoints = location === Screens.THREAD ? 3 : 2;

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
