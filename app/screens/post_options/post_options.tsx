// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useMemo} from 'react';
import {ScrollView} from 'react-native';

import {CopyPermalinkOption, FollowThreadOption, ReplyOption, SaveOption} from '@components/common_post_options';
import CopyTextOption from '@components/copy_text_option';
import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {REACTION_PICKER_HEIGHT, REACTION_PICKER_MARGIN} from '@constants/reaction_picker';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import BottomSheet from '@screens/bottom_sheet';
import {dismissBottomSheet} from '@screens/navigation';
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
    sourceScreen: AvailableScreens;
    post: PostModel;
    thread?: ThreadModel;
    componentId: AvailableScreens;
    bindings: AppBinding[];
    serverUrl: string;
    isBoRPost?: boolean;
    showBoRReadReceipts?: boolean;
    borReceiptData?: BurnOnReadRecipientData;
    currentUser?: UserModel;
};
const PostOptions = ({
    canAddReaction, canDelete, canEdit,
    canMarkAsUnread, canPin, canReply,
    combinedPost, componentId, isSaved,
    sourceScreen, post, thread, bindings, serverUrl,
    isBoRPost, showBoRReadReceipts, borReceiptData, currentUser,
}: PostOptionsProps) => {
    const managedConfig = useManagedConfig<ManagedConfig>();
    const isTablet = useIsTablet();
    const {enabled, panResponder} = useBottomSheetListsFix();
    const Scroll = useMemo(() => (isTablet ? ScrollView : BottomSheetScrollView), [isTablet]);

    const close = () => {
        return dismissBottomSheet(Screens.POST_OPTIONS);
    };

    useNavButtonPressed(POST_OPTIONS_BUTTON, componentId, close, []);

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
            canMarkAsUnread, canPin, canReply, canSavePost, shouldRenderFollow,
        ].reduce((acc, v) => {
            return v ? acc + 1 : acc;
        }, 0) + (shouldShowBindings ? 0.5 : 0);

        items.push(
            bottomSheetSnapPoint(optionsCount, ITEM_HEIGHT) +
            (canAddReaction ? REACTION_PICKER_HEIGHT + REACTION_PICKER_MARGIN : 0) +
            (shouldShowBORReadReceipts ? BOR_READ_RECEIPTS_HEIGHT : 0),
        );

        if (shouldShowBindings) {
            items.push('80%');
        }

        return items;
    }, [
        canAddReaction, canCopyPermalink, canCopyText,
        canDelete, canEdit, shouldRenderFollow, shouldShowBindings,
        canMarkAsUnread, canPin, canReply, canSavePost,
    ]);

    const renderContent = () => {
        return (
            <Scroll
                bounces={false}
                scrollEnabled={enabled}
                {...panResponder.panHandlers}
            >
                {shouldShowBORReadReceipts &&
                    <BORReadReceipts
                        totalReceipts={borReceiptData.totalRecipients}
                        readReceipts={borReceiptData.revealedCount}
                    />
                }
                {canAddReaction &&
                    <ReactionBar
                        bottomSheetId={Screens.POST_OPTIONS}
                        postId={post.id}
                    />
                }
                {canReply &&
                    <ReplyOption
                        bottomSheetId={Screens.POST_OPTIONS}
                        post={post}
                    />
                }
                {shouldRenderFollow &&
                    <FollowThreadOption
                        bottomSheetId={Screens.POST_OPTIONS}
                        thread={thread}
                    />
                }
                {canMarkAsUnread && !isSystemPost &&
                <MarkAsUnreadOption
                    bottomSheetId={Screens.POST_OPTIONS}
                    post={post}
                    sourceScreen={sourceScreen}
                />
                }
                {canCopyPermalink &&
                <CopyPermalinkOption
                    bottomSheetId={Screens.POST_OPTIONS}
                    post={post}
                    sourceScreen={sourceScreen}
                />
                }
                {canSavePost &&
                <SaveOption
                    bottomSheetId={Screens.POST_OPTIONS}
                    isSaved={isSaved}
                    postId={post.id}
                />
                }
                {Boolean(canCopyText && post.message) &&
                <CopyTextOption
                    bottomSheetId={Screens.POST_OPTIONS}
                    postMessage={post.messageSource || post.message}
                    sourceScreen={sourceScreen}
                />}
                {canPin &&
                <PinChannelOption
                    bottomSheetId={Screens.POST_OPTIONS}
                    isPostPinned={post.isPinned}
                    postId={post.id}
                />
                }
                {canEdit &&
                <EditOption
                    bottomSheetId={Screens.POST_OPTIONS}
                    post={post}
                    canDelete={canDelete}
                />
                }
                {canDelete &&
                <DeletePostOption
                    bottomSheetId={Screens.POST_OPTIONS}
                    combinedPost={combinedPost}
                    post={post}
                    currentUser={currentUser}
                />}
                {shouldShowBindings &&
                <AppBindingsPostOptions
                    bottomSheetId={Screens.POST_OPTIONS}
                    post={post}
                    serverUrl={serverUrl}
                    bindings={bindings}
                />
                }
            </Scroll>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={POST_OPTIONS_BUTTON}
            componentId={Screens.POST_OPTIONS}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            testID='post_options'
        />
    );
};

export default React.memo(PostOptions);
