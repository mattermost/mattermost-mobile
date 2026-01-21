// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useMemo} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {CopyPermalinkOption, FollowThreadOption, ReplyOption, SaveOption} from '@components/common_post_options';
import CopyTextOption from '@components/copy_text_option';
import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {REACTION_PICKER_HEIGHT, REACTION_PICKER_MARGIN} from '@constants/reaction_picker';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';
import BottomSheet from '@screens/bottom_sheet';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {isSystemMessage} from '@utils/post';

import AppBindingsPostOptions from './options/app_bindings_post_option';
import DeletePostOption from './options/delete_post_option';
import EditOption from './options/edit_option';
import MarkAsUnreadOption from './options/mark_unread_option';
import PinChannelOption from './options/pin_channel_option';
import ReactionBar from './reaction_bar';

import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';
import type {AvailableScreens} from '@typings/screens/navigation';

type PostOptionsProps = {
    canAddReaction: boolean;
    canDelete: boolean;
    canEdit: boolean;
    canMarkAsUnread: boolean;
    canPin: boolean;
    canReply: boolean;
    combinedPost?: Post | PostModel;
    isSaved: boolean;
    sourceScreen: AvailableScreens;
    post: PostModel;
    thread?: ThreadModel;
    bindings: AppBinding[];
    serverUrl: string;
    isBoRPost?: boolean;
};
const PostOptions = ({
    canAddReaction, canDelete, canEdit,
    canMarkAsUnread, canPin, canReply,
    combinedPost, isSaved,
    sourceScreen, post, thread, bindings, serverUrl,
    isBoRPost,
}: PostOptionsProps) => {
    const managedConfig = useManagedConfig<ManagedConfig>();
    const {enabled, panResponder} = useBottomSheetListsFix();
    const {bottom} = useSafeAreaInsets();
    const isSystemPost = isSystemMessage(post);

    const canCopyPermalink = !isSystemPost && managedConfig?.copyAndPasteProtection !== 'true';
    const canCopyText = canCopyPermalink && post.message && !isBoRPost;

    const shouldRenderFollow = !(sourceScreen !== Screens.CHANNEL || !thread);
    const shouldShowBindings = bindings.length > 0 && !isSystemPost;

    const snapPoints = useMemo(() => {
        const items: Array<string | number> = [1];
        const optionsCount = [
            canCopyPermalink, canCopyText, canDelete, canEdit,
            canMarkAsUnread, canPin, canReply, !isSystemPost, shouldRenderFollow,
        ].reduce((acc, v) => {
            return v ? acc + 1 : acc;
        }, 0) + (shouldShowBindings ? 0.5 : 0);

        items.push(bottomSheetSnapPoint(optionsCount, ITEM_HEIGHT) + (canAddReaction ? REACTION_PICKER_HEIGHT + REACTION_PICKER_MARGIN : 0) + bottom);

        if (shouldShowBindings) {
            items.push('80%');
        }

        return items;
    }, [canCopyPermalink, canCopyText, canDelete, canEdit, canMarkAsUnread, canPin, canReply, isSystemPost, shouldRenderFollow, shouldShowBindings, canAddReaction, bottom]);

    const renderContent = () => {
        return (
            <BottomSheetScrollView
                bounces={false}
                scrollEnabled={enabled}
                {...panResponder.panHandlers}
            >
                {canAddReaction && <ReactionBar postId={post.id}/>}
                {canReply && <ReplyOption post={post}/>}
                {shouldRenderFollow && <FollowThreadOption thread={thread}/>}
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
                    postMessage={post.messageSource || post.message}
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
                {shouldShowBindings &&
                <AppBindingsPostOptions
                    post={post}
                    serverUrl={serverUrl}
                    bindings={bindings}
                />
                }
            </BottomSheetScrollView>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            screen={Screens.POST_OPTIONS}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            testID='post_options'
        />
    );
};

export default React.memo(PostOptions);
