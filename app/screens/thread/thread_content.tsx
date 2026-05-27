// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PortalProvider} from '@gorhom/portal';
import React from 'react';
import {StyleSheet} from 'react-native';

import ChannelBanner from '@components/channel_banner';
import {KeyboardAwarePostDraftContainer} from '@components/keyboard_aware_post_draft_container';
import PostDraft from '@components/post_draft';
import ScheduledPostIndicator from '@components/scheduled_post_indicator';
import {Screens} from '@constants';
import {KeyboardStateProvider} from '@context/keyboard_state';

import ThreadPostList from './thread_post_list';

import type PostModel from '@typings/database/models/servers/post';

type ThreadContentProps = {
    rootId: string;
    rootPost: PostModel;
    scheduledPostCount: number;
    containerHeight: number;
    enabled?: boolean;
    includeChannelBanner?: boolean;
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
    includeChannelBanner,
}: ThreadContentProps) => {
    return (
        <KeyboardStateProvider
            tabBarHeight={0}
            enabled={enabled}
        >
            <PortalProvider>
                <KeyboardAwarePostDraftContainer
                    textInputNativeID={THREAD_POST_INPUT_NATIVE_ID}
                    containerStyle={styles.flex}
                    renderList={() => (
                        <>
                            {includeChannelBanner &&
                                <ChannelBanner
                                    channelId={rootPost.channelId}
                                    isTopItem={true}
                                    skipHeaderOffset={true}
                                />
                            }
                            <ThreadPostList
                                rootPost={rootPost}
                            />
                        </>
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
            </PortalProvider>
        </KeyboardStateProvider>
    );
};

export default ThreadContent;

