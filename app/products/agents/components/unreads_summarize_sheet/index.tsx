// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {requestChannelInterval} from '@agents/actions/remote/channel_interval';
import AgentAnalysisSheet, {type AnalysisOption} from '@agents/components/agent_analysis_sheet';
import {CHANNEL_INTERVAL_PRESETS} from '@agents/constants';
import {useServerUrl} from '@context/server';

const messages = defineMessages({
    summarizeUnreads: {id: 'agents.unreads_summarize.option.summarize_unreads', defaultMessage: 'Summarize new messages'},
    actionItems: {id: 'agents.unreads_summarize.option.action_items', defaultMessage: 'Find action items'},
    openQuestions: {id: 'agents.unreads_summarize.option.open_questions', defaultMessage: 'Find open questions'},
    errorTitle: {id: 'agents.unreads_summarize.error_title', defaultMessage: 'Unable to run analysis'},
});

// Mirrors the plugin webapp's Ask AI menu on the New Messages separator
// (unreads_summarize.tsx).
const PRESET_OPTIONS: AnalysisOption[] = [
    {value: CHANNEL_INTERVAL_PRESETS.SUMMARIZE_UNREADS, message: messages.summarizeUnreads, icon: 'ai-summarize'},
    {value: CHANNEL_INTERVAL_PRESETS.ACTION_ITEMS, message: messages.actionItems, icon: 'check-circle-outline'},
    {value: CHANNEL_INTERVAL_PRESETS.OPEN_QUESTIONS, message: messages.openQuestions, icon: 'help-circle-outline'},
];

type Props = {
    channelId: string;

    // The same value the New Messages separator is drawn from, so the summary
    // window matches what the user sees on screen.
    lastViewedAt: number;
};

const UnreadsSummarizeSheet = ({channelId, lastViewedAt}: Props) => {
    const serverUrl = useServerUrl();

    const handleSubmit = useCallback((preset: string, botUsername: string) => (
        requestChannelInterval(serverUrl, channelId, lastViewedAt, preset, botUsername)
    ), [serverUrl, channelId, lastViewedAt]);

    return (
        <AgentAnalysisSheet
            channelId={channelId}
            options={PRESET_OPTIONS}
            onSubmit={handleSubmit}
            errorTitle={messages.errorTitle}
            testID='agents.unreads_summarize'
        />
    );
};

export default UnreadsSummarizeSheet;
