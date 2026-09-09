// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';
import {Platform} from 'react-native';

import ThreadAnalysisSheet from '@agents/components/thread_analysis_sheet';
import {BaseOption} from '@components/common_post_options';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';

type Props = {
    postId: string;
    channelId: string;
}

const messages = defineMessages({
    askAgents: {
        id: 'agents.thread_analysis.ask_agents',
        defaultMessage: 'Ask Agents',
    },
});

/**
 * One "Ask Agents" row in the post options sheet, opening a submenu with the
 * three thread analysis types (mobile's sheet is crowded, so the three types
 * cost a single row here instead of three like the webapp).
 */
const AskAgentsPostOption = ({postId, channelId}: Props) => {
    const onPress = useCallback(async () => {
        await dismissBottomSheet();

        const renderContent = () => (
            <ThreadAnalysisSheet
                postId={postId}
                channelId={channelId}
            />
        );

        bottomSheet(
            renderContent,
            [1, Platform.select({ios: '46%', default: '40%'})],
        );
    }, [postId, channelId]);

    return (
        <BaseOption
            message={messages.askAgents}
            iconName='creation-outline'
            onPress={onPress}
            testID='post_options.ask_agents.option'
        />
    );
};

export default AskAgentsPostOption;
