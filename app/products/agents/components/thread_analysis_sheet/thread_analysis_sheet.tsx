// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {defineMessages, useIntl, type MessageDescriptor} from 'react-intl';
import {Alert, Pressable, Text, View} from 'react-native';

import {fetchAIBots} from '@agents/actions/remote/bots';
import {saveSelectedAgent} from '@agents/actions/remote/preference';
import {requestThreadAnalysis} from '@agents/actions/remote/thread_analysis';
import AgentSelectorPanel from '@agents/components/channel_summary_sheet/agent_selector_panel';
import {THREAD_ANALYSIS_TYPES, type ThreadAnalysisType} from '@agents/constants';
import {filterAgentsForChannel, resolveAgentSelection} from '@agents/utils';
import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissBottomSheet} from '@screens/navigation';
import {getErrorMessage, getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {SelectableAgent} from '@agents/types';
import type AiBotModel from '@agents/types/database/models/ai_bot';

type AnalysisOption = {
    type: ThreadAnalysisType;
    message: MessageDescriptor;
    icon: CompassIconName;
};

const messages = defineMessages({
    summarizeThread: {id: 'agents.thread_analysis.option.summarize_thread', defaultMessage: 'Summarize Thread'},
    actionItems: {id: 'agents.thread_analysis.option.action_items', defaultMessage: 'Find action items'},
    openQuestions: {id: 'agents.thread_analysis.option.open_questions', defaultMessage: 'Find open questions'},
    errorTitle: {id: 'agents.thread_analysis.error_title', defaultMessage: 'Unable to run analysis'},
});

// Mirrors the plugin webapp's AI Actions post menu (post_menu.tsx).
const ANALYSIS_OPTIONS: AnalysisOption[] = [
    {type: THREAD_ANALYSIS_TYPES.SUMMARIZE_THREAD, message: messages.summarizeThread, icon: 'ai-summarize'},
    {type: THREAD_ANALYSIS_TYPES.ACTION_ITEMS, message: messages.actionItems, icon: 'check-circle-outline'},
    {type: THREAD_ANALYSIS_TYPES.OPEN_QUESTIONS, message: messages.openQuestions, icon: 'help-circle-outline'},
];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    agentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    agentLabel: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
    agentSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    agentName: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 100, 'Regular'),
    },
    optionsContainer: {
        paddingVertical: 8,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: changeOpacity(theme.centerChannelBg, 0.7),
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
        gap: 12,
    },
    emptyText: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        textAlign: 'center',
        ...typography('Body', 200, 'Regular'),
    },
    privacyFooter: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        paddingTop: 8,
        ...typography('Body', 75, 'Regular'),
    },
}));

type Props = {
    postId: string;
    channelId: string;
    bots: AiBotModel[];
    selectedAgentId: string;
};

const ThreadAnalysisSheet = ({postId, channelId, bots, selectedAgentId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [submitting, setSubmitting] = useState(false);
    const [showAgentSelector, setShowAgentSelector] = useState(false);

    // Only offer agents the server will accept for this channel; the analyze
    // endpoint enforces per-channel bot usage restrictions (403 otherwise).
    const channelBots = useMemo(
        () => filterAgentsForChannel(bots, channelId),
        [bots, channelId],
    );

    const {agent: autoResolvedAgent, showPicker} = useMemo(
        () => resolveAgentSelection(channelBots, selectedAgentId),
        [channelBots, selectedAgentId],
    );
    const [selectedAgent, setSelectedAgent] = useState<SelectableAgent | null>(autoResolvedAgent);

    // Refresh the DB-backed bot list on open.
    useEffect(() => {
        fetchAIBots(serverUrl);
    }, [serverUrl]);

    // Auto-resolve the selected agent (saved pref -> default -> first) without persisting.
    useEffect(() => {
        setSelectedAgent((current) => current ?? autoResolvedAgent);
    }, [autoResolvedAgent]);

    const handleOptionPress = useCallback(async (optionType: string | boolean) => {
        if (submitting || !selectedAgent) {
            return;
        }

        const option = ANALYSIS_OPTIONS.find((o) => o.type === optionType);
        if (!option) {
            return;
        }

        setSubmitting(true);
        const {error} = await requestThreadAnalysis(serverUrl, postId, option.type, selectedAgent.username);

        if (error) {
            setSubmitting(false);
            Alert.alert(
                intl.formatMessage(messages.errorTitle),
                getErrorMessage(error, intl),
            );
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, postId, selectedAgent, intl, submitting]);

    const handleOptionPressDebounced = usePreventDoubleTap(handleOptionPress);

    const handleAgentSelectorOpen = useCallback(() => {
        setShowAgentSelector(true);
    }, []);

    const handleAgentSelectorBack = useCallback(() => {
        setShowAgentSelector(false);
    }, []);

    const handleAgentSelect = useCallback(async (agent: SelectableAgent) => {
        setSelectedAgent(agent);
        setShowAgentSelector(false);
        const {error} = await saveSelectedAgent(serverUrl, agent.id);
        if (error) {
            logError('Failed to persist agent selection', getFullErrorMessage(error));
        }
    }, [serverUrl]);

    if (channelBots.length === 0) {
        return (
            <BottomSheetScrollView>
                <View style={styles.emptyContainer}>
                    <CompassIcon
                        name='creation-outline'
                        size={48}
                        color={changeOpacity(theme.centerChannelColor, 0.48)}
                    />
                    <FormattedText
                        id='agents.channel_summary.no_agents'
                        defaultMessage='No agents are available for this channel.'
                        style={styles.emptyText}
                        testID='post_options.ask_agents.no_agents'
                    />
                </View>
            </BottomSheetScrollView>
        );
    }

    if (showAgentSelector) {
        return (
            <AgentSelectorPanel
                agents={channelBots}
                currentAgentUsername={selectedAgent?.username ?? ''}
                onSelectAgent={handleAgentSelect}
                onBack={handleAgentSelectorBack}
            />
        );
    }

    const selectedAgentDisplayName = selectedAgent?.displayName || selectedAgent?.username || '';

    return (
        <BottomSheetScrollView>
            {showPicker && (
                <Pressable
                    onPress={handleAgentSelectorOpen}
                    style={({pressed}) => [styles.agentRow, pressed && {opacity: 0.72}]}
                    testID='post_options.ask_agents.agent_selector'
                    disabled={submitting}
                >
                    <FormattedText
                        id='agents.channel_summary.selected_agent'
                        defaultMessage='Selected Agent'
                        style={styles.agentLabel}
                    />
                    <View style={styles.agentSelector}>
                        <Text style={styles.agentName}>{selectedAgentDisplayName}</Text>
                        <CompassIcon
                            name='chevron-right'
                            size={20}
                            color={changeOpacity(theme.centerChannelColor, 0.32)}
                        />
                    </View>
                </Pressable>
            )}

            <View style={styles.optionsContainer}>
                {ANALYSIS_OPTIONS.map((option) => (
                    <OptionItem
                        key={option.type}
                        action={handleOptionPressDebounced}
                        label={intl.formatMessage(option.message)}
                        icon={option.icon}
                        testID={`post_options.ask_agents.option.${option.type}`}
                        type='default'
                        value={option.type}
                    />
                ))}
            </View>

            <FormattedText
                id='agents.channel_summary.only_visible_to_you'
                defaultMessage='Agents post responses in a direct message which will only be visible to you.'
                style={styles.privacyFooter}
                testID='post_options.ask_agents.only_visible_to_you'
            />

            {submitting && (
                <View style={styles.loadingOverlay}>
                    <Loading color={theme.buttonBg}/>
                </View>
            )}
        </BottomSheetScrollView>
    );
};

export default ThreadAnalysisSheet;
