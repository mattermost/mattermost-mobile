// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import {KeyboardAwarePostDraftContainer} from '@components/keyboard_aware_post_draft_container';
import PostDraft from '@components/post_draft';
import ScheduledPostIndicator from '@components/scheduled_post_indicator';
import {Screens} from '@constants';

import ChannelPostList from './channel_post_list';

type ChannelContentProps = {
    channelId: string;
    marginTop: number;
    scheduledPostCount: number;
    containerHeight: number;
}

const CHANNEL_POST_DRAFT_TESTID = 'channel.post_draft';

// This follows the same pattern as draft_input.tsx: `${testID}.post.input`
const CHANNEL_POST_INPUT_NATIVE_ID = `${CHANNEL_POST_DRAFT_TESTID}.post.input`;

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const ChannelContent = ({
    channelId,
    marginTop,
    scheduledPostCount,
    containerHeight,
}: ChannelContentProps) => {
    return (
        <KeyboardAwarePostDraftContainer
            textInputNativeID={CHANNEL_POST_INPUT_NATIVE_ID}
            containerStyle={[styles.flex, {marginTop}]}
            renderList={({listRef}) => (
                <ChannelPostList
                    channelId={channelId}
                    listRef={listRef}
                />
            )}
        >
            {scheduledPostCount > 0 &&
                <ScheduledPostIndicator scheduledPostCount={scheduledPostCount}/>
            }
            <PostDraft
                channelId={channelId}
                testID={CHANNEL_POST_DRAFT_TESTID}
                containerHeight={containerHeight}
                isChannelScreen={true}
                canShowPostPriority={true}
                location={Screens.CHANNEL}
            />
        </KeyboardAwarePostDraftContainer>
    );
};

export default ChannelContent;

