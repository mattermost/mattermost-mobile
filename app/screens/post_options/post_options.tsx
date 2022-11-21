// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import withObservables from '@nozbe/with-observables';
import React from 'react';

import {AppBindingLocations} from '@app/constants/apps';
import {useServerUrl, withServerUrl} from '@app/context/server';
import AppsManager from '@app/managers/apps_manager';
import {CopyPermalinkOption, FollowThreadOption, ReplyOption, SaveOption} from '@components/common_post_options';
import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import BottomSheet from '@screens/bottom_sheet';
import {dismissModal} from '@screens/navigation';
import {isSystemMessage} from '@utils/post';

import AppBindingsPostOptions from './options/app_bindings_post_option';
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
    bindings: AppBinding[];
};
const PostOptions = ({
    canAddReaction, canDelete, canEdit,
    canMarkAsUnread, canPin, canReply,
    combinedPost, componentId, isSaved,
    sourceScreen, post, thread, bindings,
}: PostOptionsProps) => {
    const managedConfig = useManagedConfig<ManagedConfig>();
    const serverUrl = useServerUrl();

    const close = () => {
        dismissModal({componentId});
    };

    useNavButtonPressed(POST_OPTIONS_BUTTON, componentId, close, []);

    const isSystemPost = isSystemMessage(post);

    const canCopyPermalink = !isSystemPost && managedConfig?.copyAndPasteProtection !== 'true';
    const canCopyText = canCopyPermalink && post.message;

    const shouldRenderFollow = !(sourceScreen !== Screens.CHANNEL || !thread);
    const shouldShowBindings = bindings.length > 0 && !isSystemPost;

    let snapPoints = [
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
                {shouldShowBindings &&
                <AppBindingsPostOptions
                    post={post}
                    serverUrl={serverUrl}
                    bindings={bindings}
                />
                }
            </>
        );
    };

    const additionalSnapPoints = 2;
    const lowerSnapPoints = snapPoints + additionalSnapPoints;

    let upperSnapPoints = lowerSnapPoints;
    if (shouldShowBindings) {
        upperSnapPoints += bindings.length;
    }

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={POST_OPTIONS_BUTTON}
            componentId={Screens.POST_OPTIONS}
            initialSnapIndex={1}
            snapPoints={[upperSnapPoints * ITEM_HEIGHT, lowerSnapPoints * ITEM_HEIGHT, 10]}
            testID='post_options'
        />
    );
};

type OwnProps = {
    serverUrl: string;
}

const withBindings = withObservables([], (ownProps: OwnProps) => ({
    bindings: AppsManager.observeBindings(ownProps.serverUrl, AppBindingLocations.POST_MENU_ITEM),
}));

export default React.memo(withServerUrl(withBindings(PostOptions)));
