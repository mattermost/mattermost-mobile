// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {requestThreadAnalysis} from '@agents/actions/remote/thread_analysis';
import AgentAnalysisSheet, {type AnalysisOption} from '@agents/components/agent_analysis_sheet';
import {THREAD_ANALYSIS_TYPES} from '@agents/constants';
import {useServerUrl} from '@context/server';

const messages = defineMessages({
    summarizeThread: {id: 'agents.thread_analysis.option.summarize_thread', defaultMessage: 'Summarize Thread'},
    actionItems: {id: 'agents.thread_analysis.option.action_items', defaultMessage: 'Find action items'},
    openQuestions: {id: 'agents.thread_analysis.option.open_questions', defaultMessage: 'Find open questions'},
    errorTitle: {id: 'agents.thread_analysis.error_title', defaultMessage: 'Unable to run analysis'},
});

// Mirrors the plugin webapp's AI Actions post menu (post_menu.tsx).
const ANALYSIS_OPTIONS: AnalysisOption[] = [
    {value: THREAD_ANALYSIS_TYPES.SUMMARIZE_THREAD, message: messages.summarizeThread, icon: 'ai-summarize'},
    {value: THREAD_ANALYSIS_TYPES.ACTION_ITEMS, message: messages.actionItems, icon: 'check-circle-outline'},
    {value: THREAD_ANALYSIS_TYPES.OPEN_QUESTIONS, message: messages.openQuestions, icon: 'help-circle-outline'},
];

type Props = {
    postId: string;
    channelId: string;
};

const ThreadAnalysisSheet = ({postId, channelId}: Props) => {
    const serverUrl = useServerUrl();

    const handleSubmit = useCallback((analysisType: string, botUsername: string) => (
        requestThreadAnalysis(serverUrl, postId, analysisType, botUsername)
    ), [serverUrl, postId]);

    return (
        <AgentAnalysisSheet
            channelId={channelId}
            options={ANALYSIS_OPTIONS}
            onSubmit={handleSubmit}
            errorTitle={messages.errorTitle}
            testID='agents.thread_analysis'
        />
    );
};

export default ThreadAnalysisSheet;
