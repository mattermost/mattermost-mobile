// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {isSystemMessage} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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

//fixme: should this be even a screen ??
//fixme: some props are optional - review them

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
        },
        optionContainer: {
            marginLeft: -20,
        },
        icon: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.56),
        },
    };
});

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
    isSaved?: boolean;
    location: typeof Screens[keyof typeof Screens];
    post: PostModel;
};

//todo: look up the permission here and render each option accordingly
const PostOptions = ({
    canAddReaction = true,
    canCopyPermalink = true,
    canCopyText = true,
    canDelete = true,
    canEdit = true,
    canEditUntil = -1,
    canMarkAsUnread = true,
    canPin = true,
    canSave = true,
    isSaved = true,
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
            {canAddReaction && <ReactionBar theme={theme}/>}
            <View style={styles.optionContainer}>
                <ReplyOption/>
                <FollowThreadOption
                    location={location}
                />
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
            </View>
        </View>
    );
};

export default PostOptions;
