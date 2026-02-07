// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AIRewriteAction from '@agents/components/ai_rewrite_action';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import AttachmentAction from './attachment_quick_action';
import EmojiAction from './emoji_quick_action';
import InputAction from './input_quick_action';
import PostPriorityAction from './post_priority_action';

type Props = {
    testID?: string;
    canUploadFiles: boolean;
    fileCount: number;
    isAgentsEnabled: boolean;
    isPostPriorityEnabled: boolean;
    canShowPostPriority?: boolean;
    canShowSlashCommands?: boolean;
    canShowEmojiPicker?: boolean;
    maxFileCount: number;

    // Draft Handler
    value: string;
    updateValue: (value: string) => void;
    addFiles: (file: FileInfo[]) => void;
    postPriority: PostPriority;
    updatePostPriority: (postPriority: PostPriority) => void;
    focus: () => void;
}

export const QUICK_ACTIONS_HEIGHT = 44;

const style = StyleSheet.create({
    quickActionsContainer: {
        display: 'flex',
        flexDirection: 'row',
        height: QUICK_ACTIONS_HEIGHT,
        marginLeft: 8,
    },
});

export default function QuickActions({
    testID,
    canUploadFiles,
    value,
    fileCount,
    isAgentsEnabled,
    isPostPriorityEnabled,
    canShowSlashCommands = true,
    canShowPostPriority,
    canShowEmojiPicker = true,
    maxFileCount,
    updateValue,
    addFiles,
    postPriority,
    updatePostPriority,
    focus,
}: Props) {
    const atDisabled = value.endsWith('@');
    const slashDisabled = value.length > 0;

    const atInputActionTestID = `${testID}.at_input_action`;
    const slashInputActionTestID = `${testID}.slash_input_action`;
    const emojiActionTestID = `${testID}.emoji_action`;
    const attachmentActionTestID = `${testID}.attachment_action`;
    const aiRewriteActionTestID = `${testID}.ai_rewrite_action`;
    const postPriorityActionTestID = `${testID}.post_priority_action`;

    const uploadProps = {
        disabled: !canUploadFiles,
        fileCount,
        maxFileCount,
        maxFilesReached: fileCount >= maxFileCount,
        onUploadFiles: addFiles,
    };

    return (
        <View
            testID={testID}
            style={style.quickActionsContainer}
        >
            <AttachmentAction
                testID={attachmentActionTestID}
                {...uploadProps}
            />
            <InputAction
                testID={atInputActionTestID}
                disabled={atDisabled}
                inputType='at'
                updateValue={updateValue}
                focus={focus}
            />
            {canShowSlashCommands && (
                <InputAction
                    testID={slashInputActionTestID}
                    disabled={slashDisabled}
                    inputType='slash'
                    updateValue={updateValue}
                    focus={focus}
                />
            )}
            {canShowEmojiPicker && (
                <EmojiAction
                    testID={emojiActionTestID}
                />
            )}
            {isAgentsEnabled && (
                <AIRewriteAction
                    testID={aiRewriteActionTestID}
                    value={value}
                    updateValue={updateValue}
                />
            )}
            {isPostPriorityEnabled && canShowPostPriority && (
                <PostPriorityAction
                    testID={postPriorityActionTestID}
                    postPriority={postPriority}
                    updatePostPriority={updatePostPriority}
                />
            )}
        </View>
    );
}
