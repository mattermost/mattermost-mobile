// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useMemo} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {CopyPermalinkOption, FollowThreadOption, ReplyOption, SaveOption, ShowTranslationOption} from '@components/common_post_options';
import CopyTextOption from '@components/copy_text_option';
import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {isEdgeToEdge} from '@constants/device';
import {REACTION_PICKER_HEIGHT, REACTION_PICKER_MARGIN} from '@constants/reaction_picker';
import {NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN} from '@constants/view';
import BottomSheet from '@screens/bottom_sheet';
import BORReadReceipts, {BOR_READ_RECEIPTS_HEIGHT} from '@screens/post_options/bor_read_receipts';
import {isOwnBoRPost, isUnrevealedBoRPost} from '@utils/bor';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {isSystemMessage} from '@utils/post';

import AppBindingsPostOptions from './options/app_bindings_post_option';
import DeletePostOption from './options/delete_post_option';
import EditOption from './options/edit_option';
import MarkAsUnreadOption from './options/mark_unread_option';
import PinChannelOption from './options/pin_channel_option';
import ReactionBar from './reaction_bar';

import type {BurnOnReadRecipientData} from '@typings/components/post_options';
import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type PostOptionsProps = {
    canAddReaction: boolean;
    canDelete: boolean;
    canEdit: boolean;
    canMarkAsUnread: boolean;
    canPin: boolean;
    canReply: boolean;
    canViewTranslation: boolean;
    combinedPost?: Post | PostModel;
    isSaved: boolean;
    sourceScreen: AvailableScreens;
    post: PostModel;
    thread?: ThreadModel;
    bindings: AppBinding[];
    serverUrl: string;
    isBoRPost?: boolean;
    showBoRReadReceipts?: boolean;
    borReceiptData?: BurnOnReadRecipientData;
    currentUser?: UserModel;
};
const PostOptions = ({
    canAddReaction, canDelete, canEdit,
    canMarkAsUnread, canPin, canReply, canViewTranslation,
    combinedPost, isSaved,
    sourceScreen, post, thread, bindings, serverUrl,
    isBoRPost, showBoRReadReceipts, borReceiptData, currentUser,
}: PostOptionsProps) => {
    const managedConfig = useManagedConfig<ManagedConfig>();
    const {bottom} = useSafeAreaInsets();
    const isSystemPost = isSystemMessage(post);

    const canCopyBoRPostPermalink = isBoRPost ? post.userId === currentUser?.id : true;
    const canCopyPermalink = !isSystemPost && managedConfig?.copyAndPasteProtection !== 'true' && canCopyBoRPostPermalink;
    const canCopyText = canCopyPermalink && post.message && !isBoRPost;

    const canSavePost = !isSystemPost && (!isUnrevealedBoRPost(post) || isOwnBoRPost(post, currentUser?.id));

    const shouldRenderFollow = !(sourceScreen !== Screens.CHANNEL || !thread);
    const shouldShowBindings = bindings.length > 0 && !isSystemPost;

    const shouldShowBORReadReceipts = showBoRReadReceipts && borReceiptData;

    const snapPoints = useMemo(() => {
        const items: Array<string | number> = [1];
        const optionsCount = [
            canCopyPermalink, canCopyText, canDelete, canEdit,
            canMarkAsUnread, canPin, canReply, canSavePost, shouldRenderFollow, canViewTranslation,
        ].reduce((acc, v) => {
            return v ? acc + 1 : acc;
        }, 0) + (shouldShowBindings ? 0.5 : 0);

        const snapBottom = isEdgeToEdge ? bottom : NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN;

        items.push(
            bottomSheetSnapPoint(optionsCount, ITEM_HEIGHT) +
            (canAddReaction ? REACTION_PICKER_HEIGHT + REACTION_PICKER_MARGIN : 0) +
            (shouldShowBORReadReceipts ? BOR_READ_RECEIPTS_HEIGHT : 0) + snapBottom,
        );

        if (shouldShowBindings) {
            items.push('80%');
        }

        return items;
    }, [canCopyPermalink, canCopyText, canDelete, canEdit, canMarkAsUnread, canPin, canReply, canSavePost, shouldRenderFollow, canViewTranslation, shouldShowBindings, canAddReaction, shouldShowBORReadReceipts, bottom]);

    const renderContent = () => {
        return (
            <BottomSheetScrollView
                bounces={false}
            >
                {shouldShowBORReadReceipts &&
                    <BORReadReceipts
                        totalReceipts={borReceiptData.totalRecipients}
                        readReceipts={borReceiptData.revealedCount}
                    />
                }
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
                {canViewTranslation && <ShowTranslationOption postId={post.id}/>}
                {canSavePost &&
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
                    currentUser={currentUser}
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
