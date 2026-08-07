// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';
import {Platform} from 'react-native';

import ThreadAnalysisSheet from '@agents/components/thread_analysis_sheet';
import {BaseOption} from '@components/common_post_options';
import {usePreventDoubleTap} from '@hooks/utils';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';

import type PostModel from '@typings/database/models/servers/post';

const messages = defineMessages({
    askAgents: {
        id: 'agents.channel_summary.ask_agents',
        defaultMessage: 'Ask Agents',
    },
});

type Props = {
    post: PostModel;
};

const AskAgentsOption = ({post}: Props) => {
    const openSheet = useCallback(async () => {
        const {id: postId, channelId} = post;

        // Swap the post options sheet for the analysis submenu (same pattern
        // as the channel quick actions Ask Agents entry point).
        await dismissBottomSheet();

        const renderContent = () => (
            <ThreadAnalysisSheet
                postId={postId}
                channelId={channelId}
            />
        );

        bottomSheet(
            renderContent,
            [1, Platform.select({ios: '60%', default: '40%'})],
        );
    }, [post]);

    const onPress = usePreventDoubleTap(openSheet);

    return (
        <BaseOption
            message={messages.askAgents}
            iconName='creation-outline'
            onPress={onPress}
            testID='post_options.ask_agents.option'
        />
    );
};

export default AskAgentsOption;
