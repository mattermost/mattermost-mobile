// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useEffect, useState} from 'react';
import {defineMessages, useIntl, type MessageDescriptor} from 'react-intl';
import {Alert, Pressable, Text, View} from 'react-native';

import {fetchAgents} from '@agents/actions/remote/agents';
import {saveSelectedAgent} from '@agents/actions/remote/preference';
import {requestUnreadsSummary} from '@agents/actions/remote/unreads_summary';
import {type Agent} from '@agents/client/rest';
import {INTERVAL_PRESETS} from '@agents/constants';
import {isAgentAvailableInChannel, resolveSelectedAgent} from '@agents/utils';
import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {getErrorMessage, getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import AgentSelectorPanel from '../channel_summary_sheet/agent_selector_panel';

type PresetOption = {
    id: INTERVAL_PRESETS;
    message: MessageDescriptor;
    icon: CompassIconName;
};

const messages = defineMessages({
    summarizeNew: {id: 'agents.unreads_summary.option.summarize_new', defaultMessage: 'Summarize new messages'},
    actionItems: {id: 'agents.thread_analysis.option.action_items', defaultMessage: 'Find action items'},
    openQuestions: {id: 'agents.thread_analysis.option.open_questions', defaultMessage: 'Find open questions'},
});

const PRESET_OPTIONS: PresetOption[] = [
    {id: INTERVAL_PRESETS.SummarizeUnreads, message: messages.summarizeNew, icon: 'message-text-outline'},
    {id: INTERVAL_PRESETS.ActionItems, message: messages.actionItems, icon: 'check-circle-outline'},
    {id: INTERVAL_PRESETS.OpenQuestions, message: messages.openQuestions, icon: 'help-circle-outline'},
];

type Props = {
    channelId: string;
    lastViewedAt: number;
    selectedAgentId: string;
};

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
    emptyState: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyStateText: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        textAlign: 'center',
        ...typography('Body', 200),
    },
    privacyFooter: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        paddingTop: 4,
        paddingBottom: 8,
        ...typography('Body', 75),
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
}));

/**
 * Bottom sheet for "catch me up": the three interval presets over the unread
 * window (New Messages boundary -> now). The result streams into the
 * requester's DM with the selected agent.
 */
const UnreadsSummarySheet = ({channelId, lastViewedAt, selectedAgentId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [submitting, setSubmitting] = useState(false);
    const [showAgentSelector, setShowAgentSelector] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [loadingAgents, setLoadingAgents] = useState(true);

    // Fetch agents on mount, keeping only those usable in this channel.
    useEffect(() => {
        const loadAgents = async () => {
            setLoadingAgents(true);
            const result = await fetchAgents(serverUrl);
            if (result.data) {
                setAgents(result.data.filter((agent) => isAgentAvailableInChannel(agent, channelId)));
            }
            setLoadingAgents(false);
        };
        loadAgents();
    }, [serverUrl, channelId]);

    // Auto-resolve the selected agent (saved pref -> default -> first) without persisting.
    useEffect(() => {
        if (agents.length > 0) {
            setSelectedAgent((current) => current ?? resolveSelectedAgent(agents, selectedAgentId));
        }
    }, [agents, selectedAgentId]);

    const handleOptionPress = useCallback(async (optionId: string | boolean) => {
        if (submitting || !selectedAgent) {
            return;
        }

        const option = PRESET_OPTIONS.find((o) => o.id === optionId);
        if (!option) {
            return;
        }

        setSubmitting(true);
        const {error} = await requestUnreadsSummary(serverUrl, channelId, lastViewedAt, option.id, selectedAgent.username);

        if (error) {
            setSubmitting(false);
            Alert.alert(
                intl.formatMessage({id: 'agents.unreads_summary.error_title', defaultMessage: 'Unable to summarize new messages'}),
                getErrorMessage(error, intl),
            );
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, channelId, lastViewedAt, selectedAgent, intl, submitting]);

    const handleAgentSelectorOpen = useCallback(() => {
        setShowAgentSelector(true);
    }, []);

    const handleAgentSelectorBack = useCallback(() => {
        setShowAgentSelector(false);
    }, []);

    const handleAgentSelect = useCallback(async (agent: Agent) => {
        setSelectedAgent(agent);
        setShowAgentSelector(false);
        const {error} = await saveSelectedAgent(serverUrl, agent.id);
        if (error) {
            logError('Failed to persist agent selection', getFullErrorMessage(error));
        }
    }, [serverUrl]);

    if (showAgentSelector) {
        return (
            <AgentSelectorPanel
                agents={agents}
                currentAgentUsername={selectedAgent?.username ?? ''}
                onSelectAgent={handleAgentSelect}
                onBack={handleAgentSelectorBack}
            />
        );
    }

    if (!loadingAgents && agents.length === 0) {
        return (
            <BottomSheetScrollView>
                <View style={styles.emptyState}>
                    <FormattedText
                        id='agents.channel_summary.no_agents'
                        defaultMessage='No agents are available in this channel. Contact your system admin.'
                        style={styles.emptyStateText}
                    />
                </View>
            </BottomSheetScrollView>
        );
    }

    const selectedAgentDisplayName = selectedAgent?.displayName || selectedAgent?.username || '';

    return (
        <BottomSheetScrollView>
            {/* Only offer the agent picker when the user actually has a choice. */}
            {agents.length > 1 && (
                <Pressable
                    onPress={handleAgentSelectorOpen}
                    style={({pressed}) => [styles.agentRow, pressed && {opacity: 0.72}]}
                    testID='agents.unreads_summary.agent_selector'
                    disabled={submitting || loadingAgents}
                >
                    <FormattedText
                        id='agents.channel_summary.selected_agent'
                        defaultMessage='Selected Agent'
                        style={styles.agentLabel}
                    />
                    <View style={styles.agentSelector}>
                        {loadingAgents ? (
                            <Loading size='small'/>
                        ) : (
                            <>
                                <Text style={styles.agentName}>{selectedAgentDisplayName}</Text>
                                <CompassIcon
                                    name='chevron-right'
                                    size={20}
                                    color={changeOpacity(theme.centerChannelColor, 0.32)}
                                />
                            </>
                        )}
                    </View>
                </Pressable>
            )}

            <View style={styles.optionsContainer}>
                {PRESET_OPTIONS.map((option) => (
                    <OptionItem
                        key={option.id}
                        action={handleOptionPress}
                        label={intl.formatMessage(option.message)}
                        icon={option.icon}
                        testID={`agents.unreads_summary.option.${option.id}`}
                        type='default'
                        value={option.id}
                    />
                ))}
            </View>

            {/* The result streams into a DM only the requester can see. */}
            <FormattedText
                id='agents.channel_summary.only_visible_to_you'
                defaultMessage='Results are only visible to you'
                style={styles.privacyFooter}
            />

            {submitting && (
                <View style={styles.loadingOverlay}>
                    <Loading color={theme.buttonBg}/>
                </View>
            )}
        </BottomSheetScrollView>
    );
};

export default UnreadsSummarySheet;
