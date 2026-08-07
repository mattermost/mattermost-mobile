// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useEffect, useState} from 'react';
import {defineMessages, useIntl, type MessageDescriptor} from 'react-intl';
import {Alert, Pressable, Text, View} from 'react-native';

import {fetchAgents} from '@agents/actions/remote/agents';
import {requestChannelSummary} from '@agents/actions/remote/channel_summary';
import {saveSelectedAgent} from '@agents/actions/remote/preference';
import {type Agent} from '@agents/client/rest';
import {AGENT_ANALYSIS_SUMMARY} from '@agents/constants';
import {isAgentAvailableInChannel, resolveSelectedAgent} from '@agents/utils';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
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

import AgentSelectorPanel from './agent_selector_panel';
import DateRangePicker from './date_range_picker';

type SummaryOptionId = 'unreads' | '7d' | '14d' | 'custom';

type SummaryOption = {
    id: SummaryOptionId;
    message: MessageDescriptor;
    days?: number;
    showChevron?: boolean;
};

const messages = defineMessages({
    unreads: {id: 'agents.channel_summary.option.unreads', defaultMessage: 'Summarize unreads'},
    sevenDays: {id: 'agents.channel_summary.option.7d', defaultMessage: 'Summarize last 7 days'},
    fourteenDays: {id: 'agents.channel_summary.option.14d', defaultMessage: 'Summarize last 14 days'},
    custom: {id: 'agents.channel_summary.option.custom', defaultMessage: 'Select date range to summarize'},
});

const SUMMARY_OPTIONS: SummaryOption[] = [
    {id: 'unreads', message: messages.unreads},
    {id: '7d', days: 7, message: messages.sevenDays},
    {id: '14d', days: 14, message: messages.fourteenDays},
    {id: 'custom', message: messages.custom, showChevron: true},
];

type Props = {
    channelId: string;
    selectedAgentId: string;
    lastViewedAt: number;
    teamId: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    headerSection: {
        gap: 4,
    },
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
    promptWrapper: {
        paddingTop: 4,
    },
    sendButton: {
        width: 44,
        height: 32,
        borderRadius: 4,
        backgroundColor: theme.buttonBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.5),
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
}));

const ChannelSummarySheet = ({channelId, selectedAgentId, lastViewedAt, teamId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [customPrompt, setCustomPrompt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showAgentSelector, setShowAgentSelector] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [loadingAgents, setLoadingAgents] = useState(true);

    // Fetch agents on mount, keeping only those usable in this channel —
    // a channel-scoped agent the server would reject with a 403 must not be
    // offered in the picker.
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
        if (submitting) {
            return;
        }

        const option = SUMMARY_OPTIONS.find((o) => o.id === optionId);
        if (!option) {
            return;
        }

        if (option.id === 'custom') {
            setShowDatePicker(true);
            return;
        }

        // Validate selectedAgent before setting submitting state to avoid stuck loading UI
        if (!selectedAgent) {
            return;
        }

        setSubmitting(true);
        const options: Record<string, string | number | undefined> = {
            team_id: teamId || undefined,
        };

        if (option.days) {
            options.days = option.days;
        }

        // The server has no unreads concept; bound the analysis to messages
        // since the channel was last viewed (matches the webapp). Without
        // this the request silently produced a whole-channel summary.
        if (option.id === 'unreads' && lastViewedAt > 0) {
            options.since = new Date(lastViewedAt).toISOString();
        }

        if (customPrompt.trim()) {
            options.prompt = customPrompt.trim();
        }

        const {error} = await requestChannelSummary(
            serverUrl,
            channelId,
            AGENT_ANALYSIS_SUMMARY,
            selectedAgent.username,
            options,
        );

        if (error) {
            setSubmitting(false);
            Alert.alert(
                intl.formatMessage({id: 'agents.channel_summary.error_title', defaultMessage: 'Unable to start summary'}),
                getErrorMessage(error, intl),
            );
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, channelId, selectedAgent, customPrompt, intl, submitting, lastViewedAt, teamId]);

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

    const handleCustomPromptSubmit = useCallback(async () => {
        if (!customPrompt.trim() || !selectedAgent) {
            return;
        }

        setSubmitting(true);
        const options: Record<string, string | number | undefined> = {
            prompt: customPrompt.trim(),
            team_id: teamId || undefined,
        };

        const {error} = await requestChannelSummary(
            serverUrl,
            channelId,
            AGENT_ANALYSIS_SUMMARY,
            selectedAgent.username,
            options,
        );

        if (error) {
            setSubmitting(false);
            Alert.alert(
                intl.formatMessage({id: 'agents.channel_summary.error_title', defaultMessage: 'Unable to start summary'}),
                getErrorMessage(error, intl),
            );
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, channelId, selectedAgent, customPrompt, intl, teamId]);

    const handleDateRangeSubmit = useCallback(async (since: Date, until: Date) => {
        if (!selectedAgent) {
            return;
        }

        setShowDatePicker(false);
        setSubmitting(true);

        // Normalize to UTC start/end of day to avoid missing data due to timezone conversion
        const sinceUtc = new Date(Date.UTC(since.getFullYear(), since.getMonth(), since.getDate(), 0, 0, 0));
        const untilUtc = new Date(Date.UTC(until.getFullYear(), until.getMonth(), until.getDate(), 23, 59, 59));

        const options: Record<string, string | number | undefined> = {
            since: sinceUtc.toISOString(),
            until: untilUtc.toISOString(),
            team_id: teamId || undefined,
        };

        if (customPrompt.trim()) {
            options.prompt = customPrompt.trim();
        }

        const {error} = await requestChannelSummary(
            serverUrl,
            channelId,
            AGENT_ANALYSIS_SUMMARY,
            selectedAgent.username,
            options,
        );

        if (error) {
            setSubmitting(false);
            Alert.alert(
                intl.formatMessage({id: 'agents.channel_summary.error_title', defaultMessage: 'Unable to start summary'}),
                getErrorMessage(error, intl),
            );
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, channelId, selectedAgent, customPrompt, intl, teamId]);

    const handleCustomPromptSubmitDebounced = usePreventDoubleTap(handleCustomPromptSubmit);
    const handleDateRangeSubmitDebounced = usePreventDoubleTap(handleDateRangeSubmit);

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

    if (showDatePicker) {
        return (
            <DateRangePicker
                onSubmit={handleDateRangeSubmitDebounced}
                onCancel={() => setShowDatePicker(false)}
            />
        );
    }

    const selectedAgentDisplayName = selectedAgent?.displayName || selectedAgent?.username || '';

    // No agent may be used in this channel (none configured, or all are
    // scoped elsewhere): every option would dead-end, so say so instead of
    // rendering a full option list with a blank agent.
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

    return (
        <BottomSheetScrollView>
            {/* Header Section - Agent selector + Prompt input */}
            <View style={styles.headerSection}>
                <Pressable
                    onPress={handleAgentSelectorOpen}
                    style={({pressed}) => [styles.agentRow, pressed && {opacity: 0.72}]}
                    testID='agents.channel_summary.agent_selector'
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

                <View style={styles.promptWrapper}>
                    <FloatingTextInput
                        label={intl.formatMessage({id: 'agents.channel_summary.ai_prompt_placeholder', defaultMessage: 'Ask AI about this channel'})}
                        theme={theme}
                        value={customPrompt}
                        onChangeText={setCustomPrompt}
                        testID='agents.channel_summary.prompt_input'
                        editable={!submitting}
                        onSubmitEditing={handleCustomPromptSubmitDebounced}
                        returnKeyType='send'
                        endAdornment={
                            <Pressable
                                onPress={handleCustomPromptSubmitDebounced}
                                style={({pressed}) => [
                                    styles.sendButton,
                                    (!customPrompt.trim() || submitting) && styles.sendButtonDisabled,
                                    pressed && {opacity: 0.72},
                                ]}
                                disabled={!customPrompt.trim() || submitting}
                                testID='agents.channel_summary.prompt_submit'
                            >
                                <CompassIcon
                                    name='send'
                                    size={20}
                                    color={theme.buttonColor}
                                />
                            </Pressable>
                        }
                    />
                </View>
            </View>

            {/* Summary Options */}
            <View style={styles.optionsContainer}>
                {SUMMARY_OPTIONS.map((option) => (
                    <OptionItem
                        key={option.id}
                        action={handleOptionPress}
                        label={intl.formatMessage(option.message)}
                        testID={`agents.channel_summary.option.${option.id}`}
                        type={option.showChevron ? 'arrow' : 'default'}
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

export default ChannelSummarySheet;
