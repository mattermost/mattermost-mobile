// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import * as Screens from '@constants/screens';
import {useTheme} from '@context/theme';
import {isSystemMessage} from '@utils/post';
import {makeStyleSheetFromTheme} from '@utils/theme';

import CopyLinkOption from './components/options/copy_link_option';
import CopyTextOption from './components/options/copy_text_option';
import DeletePostOption from './components/options/delete_post_option';
import EditOption from './components/options/edit_option';
import FollowThreadOption from './components/options/follow_option';
import MarkAsUnreadOption from './components/options/mark_unread_option';
import PinChannelOption from './components/options/pin_channel_option';
import ReplyOption from './components/options/reply_option';
import SaveOption from './components/options/save_option';

import type PostModel from '@typings/database/models/servers/post';

//fixme: should this be even a screen ??
//fixme: some props are optional - review them

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            marginLeft: -20,
        },
    };
});

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
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const shouldRenderEdit = canEdit && (canEditUntil === -1 || canEditUntil > Date.now());
    return (
        <View
            style={styles.container}
        >
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
