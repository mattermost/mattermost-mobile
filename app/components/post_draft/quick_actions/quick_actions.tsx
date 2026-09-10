// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import AIRewriteAction from '@agents/components/ai_rewrite_action';
import BoRQuickAction from '@components/post_draft/quick_actions/bor_quick_action';
import {Screens} from '@constants';

import AttachmentAction from './attachment_quick_action';
import EmojiAction from './emoji_quick_action';
import InputAction from './input_quick_action';
import PostPriorityAction from './post_priority_action';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    testID?: string;
    canUploadFiles: boolean;
    fileCount: number;
    isAgentsEnabled: boolean;
    isPostPriorityEnabled: boolean;
    isBoREnabled: boolean;
    canShowPostPriority?: boolean;
    canShowSlashCommands?: boolean;
    canShowEmojiPicker?: boolean;
    maxFileCount: number;
    showAttachLogs?: boolean;
    location?: AvailableScreens;

    /** Resting platform UI pill — only the plus / attachment control */
    compact?: boolean;

    /** Platform UI floating compose — drop legacy left margin; pill padding is the inset */
    floating?: boolean;

    // Draft Handler
    value: string;
    updateValue: (value: string) => void;
    addFiles: (file: FileInfo[]) => void;
    postPriority: PostPriority;
    updatePostPriority: (postPriority: PostPriority) => void;
    postBoRConfig?: PostBoRConfig;
    updatePostBoRStatus?: (config: PostBoRConfig) => void;
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
    floatingActionsContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        height: QUICK_ACTIONS_HEIGHT,
    },
    compactActionsContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        height: 40,
    },
});

export default function QuickActions({
    testID,
    canUploadFiles,
    value,
    fileCount,
    isAgentsEnabled,
    isPostPriorityEnabled,
    isBoREnabled,
    canShowSlashCommands = true,
    canShowPostPriority,
    canShowEmojiPicker = true,
    maxFileCount,
    showAttachLogs,
    compact = false,
    floating = false,
    updateValue,
    addFiles,
    postPriority,
    updatePostPriority,
    focus,
    updatePostBoRStatus,
    postBoRConfig,
    location,
}: Props) {
    const atDisabled = value.endsWith('@');
    const slashDisabled = value.length > 0;
    const showBoRAction = isBoREnabled && updatePostBoRStatus && location === Screens.CHANNEL;

    const atInputActionTestID = `${testID}.at_input_action`;
    const slashInputActionTestID = `${testID}.slash_input_action`;
    const emojiActionTestID = `${testID}.emoji_action`;
    const attachmentActionTestID = `${testID}.attachment_action`;
    const aiRewriteActionTestID = `${testID}.ai_rewrite_action`;
    const postPriorityActionTestID = `${testID}.post_priority_action`;
    const borPriorityActionTestID = `${testID}.bor_action`;

    const uploadProps = {
        disabled: !canUploadFiles,
        fileCount,
        maxFileCount,
        maxFilesReached: fileCount >= maxFileCount,
        onUploadFiles: addFiles,
        showAttachLogs,
    };

    let containerStyle: StyleProp<ViewStyle> = style.quickActionsContainer;
    if (compact) {
        containerStyle = style.compactActionsContainer;
    } else if (floating) {
        containerStyle = style.floatingActionsContainer;
    }

    return (
        <View
            testID={testID}
            style={containerStyle}
        >
            <AttachmentAction
                testID={attachmentActionTestID}
                flush={compact}
                {...uploadProps}
            />
            {!compact && (
                <>
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
                    {showBoRAction &&
                        <BoRQuickAction
                            testId={borPriorityActionTestID}
                            postBoRConfig={postBoRConfig}
                            updatePostBoRStatus={updatePostBoRStatus}
                        />
                    }
                </>
            )}
        </View>
    );
}
