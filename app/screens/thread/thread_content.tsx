// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import {KeyboardAwarePostDraftContainer} from '@components/keyboard_aware_post_draft_container';
import PostDraft from '@components/post_draft';
import ScheduledPostIndicator from '@components/scheduled_post_indicator';
import {Screens} from '@constants';

import ThreadPostList from './thread_post_list';

import type PostModel from '@typings/database/models/servers/post';

type ThreadContentProps = {
    rootId: string;
    rootPost: PostModel;
    scheduledPostCount: number;
    containerHeight: number;
    enabled?: boolean;
    onEmojiSearchFocusChange?: (focused: boolean) => void;
}

const THREAD_POST_DRAFT_TESTID = 'thread.post_draft';

// This follows the same pattern as draft_input.tsx: `${testID}.post.input`
const THREAD_POST_INPUT_NATIVE_ID = `${THREAD_POST_DRAFT_TESTID}.post.input`;

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const ThreadContent = ({
    rootId,
    rootPost,
    scheduledPostCount,
    containerHeight,
    enabled = true,
    onEmojiSearchFocusChange,
}: ThreadContentProps) => {
    return (
        <KeyboardAwarePostDraftContainer
            textInputNativeID={THREAD_POST_INPUT_NATIVE_ID}
            containerStyle={styles.flex}
            isThreadView={true}
            enabled={enabled}
            onEmojiSearchFocusChange={onEmojiSearchFocusChange}
            renderList={({listRef, onTouchMove, onTouchEnd}) => (
                <ThreadPostList
                    rootPost={rootPost}
                    listRef={listRef}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                />
            )}
        >
            {scheduledPostCount > 0 &&
                <ScheduledPostIndicator
                    isThread={true}
                    scheduledPostCount={scheduledPostCount}
                />
            }
            <PostDraft
                channelId={rootPost.channelId}
                rootId={rootId}
                testID={THREAD_POST_DRAFT_TESTID}
                containerHeight={containerHeight}
                isChannelScreen={false}
                location={Screens.THREAD}
            />
        </KeyboardAwarePostDraftContainer>
    );
};

export default ThreadContent;

