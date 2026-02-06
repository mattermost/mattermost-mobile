// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAgents} from '@agents/actions/remote/agents';
import {requestChannelSummary} from '@agents/actions/remote/channel_summary';
import {type Agent} from '@agents/client/rest';
import {AGENT_ANALYSIS_SUMMARY} from '@agents/constants';
import React, {useCallback, useEffect, useState} from 'react';
import {defineMessages, useIntl, type MessageDescriptor} from 'react-intl';
import {Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissBottomSheet} from '@screens/navigation';
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
    promptContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        padding: 12,
        gap: 8,
    },
    promptInput: {
        flex: 1,
        color: theme.centerChannelColor,
        padding: 0,
        ...typography('Body', 200, 'Regular'),
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
        ...Platform.select({
            ios: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: changeOpacity(theme.centerChannelBg, 0.7),
                justifyContent: 'center',
                alignItems: 'center',
            },
            default: {},
        }),
    },
}));

const ChannelSummarySheet = ({channelId}: Props) => {
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

    // Fetch agents on mount and set default to first agent
    useEffect(() => {
        const loadAgents = async () => {
            setLoadingAgents(true);
            const result = await fetchAgents(serverUrl);
            if (result.data && result.data.length > 0) {
                setAgents(result.data);
                setSelectedAgent(result.data[0]);
            }
            setLoadingAgents(false);
        };
        loadAgents();
    }, [serverUrl]);

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
        const options: Record<string, string | number | boolean | undefined> = {};

        if (option.days) {
            options.days = option.days;
        }

        if (option.id === 'unreads') {
            options.unreads_only = true;
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
                String(error),
            );
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, channelId, selectedAgent, customPrompt, intl, submitting]);

    const handleAgentSelectorOpen = useCallback(() => {
        setShowAgentSelector(true);
    }, []);

    const handleAgentSelectorBack = useCallback(() => {
        setShowAgentSelector(false);
    }, []);

    const handleAgentSelect = useCallback((agent: Agent) => {
        setSelectedAgent(agent);
        setShowAgentSelector(false);
    }, []);

    const handleCustomPromptSubmit = useCallback(async () => {
        if (!customPrompt.trim() || !selectedAgent) {
            return;
        }

        setSubmitting(true);
        const options: Record<string, string | number | undefined> = {
            prompt: customPrompt.trim(),
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
                String(error),
            );
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, channelId, selectedAgent, customPrompt, intl]);

    const handleDateRangeSubmit = useCallback(async (since: Date, until: Date) => {
        if (!selectedAgent) {
            return;
        }

        setShowDatePicker(false);
        setSubmitting(true);

        const options: Record<string, string | number | undefined> = {
            since: since.toISOString(),
            until: until.toISOString(),
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
                String(error),
            );
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, channelId, selectedAgent, customPrompt, intl]);

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

    return (
        <ScrollView>
            {/* Header Section - Agent selector + Prompt input */}
            <View style={styles.headerSection}>
                <TouchableOpacity
                    onPress={handleAgentSelectorOpen}
                    style={styles.agentRow}
                    testID='agents.channel_summary.agent_selector'
                    disabled={submitting || loadingAgents}
                >
                    <Text style={styles.agentLabel}>
                        {intl.formatMessage({id: 'agents.channel_summary.selected_agent', defaultMessage: 'Selected Agent'})}
                    </Text>
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
                </TouchableOpacity>

                <View style={styles.promptWrapper}>
                    <View style={styles.promptContainer}>
                        <CompassIcon
                            name='creation-outline'
                            size={20}
                            color={changeOpacity(theme.centerChannelColor, 0.64)}
                        />
                        <TextInput
                            value={customPrompt}
                            onChangeText={setCustomPrompt}
                            style={styles.promptInput}
                            placeholder={intl.formatMessage({id: 'agents.channel_summary.ai_prompt_placeholder', defaultMessage: 'Ask AI about this channel'})}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.48)}
                            testID='agents.channel_summary.prompt_input'
                            editable={!submitting}
                            onSubmitEditing={handleCustomPromptSubmitDebounced}
                            returnKeyType='send'
                        />
                        <TouchableOpacity
                            onPress={handleCustomPromptSubmitDebounced}
                            style={[
                                styles.sendButton,
                                (!customPrompt.trim() || submitting) && styles.sendButtonDisabled,
                            ]}
                            disabled={!customPrompt.trim() || submitting}
                            testID='agents.channel_summary.prompt_submit'
                        >
                            <CompassIcon
                                name='send'
                                size={20}
                                color='#FFFFFF'
                            />
                        </TouchableOpacity>
                    </View>
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

            {submitting && (
                <View style={styles.loadingOverlay}>
                    <Loading color={theme.buttonBg}/>
                </View>
            )}
        </ScrollView>
    );
};

export default ChannelSummarySheet;
