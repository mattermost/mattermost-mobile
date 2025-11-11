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
}

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
}: ThreadContentProps) => {
    return (
        <KeyboardAwarePostDraftContainer
            textInputNativeID='thread.post_draft.post.input'
            containerStyle={styles.flex}
            renderList={({listRef}) => (
                <ThreadPostList
                    nativeID={rootId}
                    rootPost={rootPost}
                    listRef={listRef}
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
                testID='thread.post_draft'
                containerHeight={containerHeight}
                isChannelScreen={false}
                location={Screens.THREAD}
            />
        </KeyboardAwarePostDraftContainer>
    );
};

export default ThreadContent;

