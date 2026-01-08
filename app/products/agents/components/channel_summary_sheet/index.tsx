// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAgents} from '@agents/actions/remote/agents';
import {requestChannelSummary} from '@agents/actions/remote/channel_summary';
import {type Agent} from '@agents/client/rest';
import {AGENT_ANALYSIS_SUMMARY} from '@agents/constants';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, Text, TextInput, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
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
    labelId: string;
    defaultLabel: string;
    days?: number;
    showChevron?: boolean;
};

const SUMMARY_OPTIONS: SummaryOption[] = [
    {id: 'unreads', labelId: 'agents.channel_summary.option.unreads', defaultLabel: 'Summarize unreads'},
    {id: '7d', days: 7, labelId: 'agents.channel_summary.option.7d', defaultLabel: 'Summarize last 7 days'},
    {id: '14d', days: 14, labelId: 'agents.channel_summary.option.14d', defaultLabel: 'Summarize last 14 days'},
    {id: 'custom', labelId: 'agents.channel_summary.option.custom', defaultLabel: 'Select date range to summarize', showChevron: true},
];

type Props = {
    channelId: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    agentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    agentLabel: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 100, 'Regular'),
    },
    agentSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    agentName: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 100, 'Regular'),
    },
    promptContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: Platform.select({ios: 12, default: 10}),
        marginBottom: 8,
        gap: 8,
    },
    promptInput: {
        flex: 1,
        color: theme.centerChannelColor,
        padding: 0,
        ...typography('Body', 200, 'Regular'),
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 4,
        backgroundColor: theme.buttonBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.5),
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    optionLabel: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
    divider: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
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

type SummaryOptionItemProps = {
    option: SummaryOption;
    onPress: (option: SummaryOption) => void;
    showDivider: boolean;
    disabled: boolean;
};

const SummaryOptionItem = React.memo(({option, onPress, showDivider, disabled}: SummaryOptionItemProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const handlePress = useCallback(() => {
        onPress(option);
    }, [onPress, option]);

    return (
        <React.Fragment>
            <TouchableOpacity
                onPress={handlePress}
                style={styles.optionRow}
                testID={`agents.channel_summary.option.${option.id}`}
                disabled={disabled}
            >
                <Text style={styles.optionLabel}>
                    {intl.formatMessage({id: option.labelId, defaultMessage: option.defaultLabel})}
                </Text>
                {option.showChevron && (
                    <CompassIcon
                        name='chevron-right'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.56)}
                    />
                )}
            </TouchableOpacity>
            {showDivider && <View style={styles.divider}/>}
        </React.Fragment>
    );
});
SummaryOptionItem.displayName = 'SummaryOptionItem';

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

    const handleOptionPress = useCallback(async (option: SummaryOption) => {
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
    }, [serverUrl, channelId, selectedAgent, customPrompt, intl]);

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

    const handleOptionPressDebounced = usePreventDoubleTap(handleOptionPress);
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
        <View style={styles.container}>
            {/* Selected Agent Row */}
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
                                color={changeOpacity(theme.centerChannelColor, 0.56)}
                            />
                        </>
                    )}
                </View>
            </TouchableOpacity>

            {/* AI Prompt Input */}
            <View style={styles.promptContainer}>
                <CompassIcon
                    name='creation-outline'
                    size={20}
                    color={changeOpacity(theme.centerChannelColor, 0.56)}
                />
                <TextInput
                    value={customPrompt}
                    onChangeText={setCustomPrompt}
                    style={styles.promptInput}
                    placeholder={intl.formatMessage({id: 'agents.channel_summary.ai_prompt_placeholder', defaultMessage: 'Ask AI to edit selection...'})}
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
                        size={18}
                        color='#FFFFFF'
                    />
                </TouchableOpacity>
            </View>

            {/* Summary Options */}
            {SUMMARY_OPTIONS.map((option, index) => (
                <SummaryOptionItem
                    key={option.id}
                    option={option}
                    onPress={handleOptionPressDebounced}
                    showDivider={index < SUMMARY_OPTIONS.length - 1}
                    disabled={submitting}
                />
            ))}

            {submitting && (
                <View style={styles.loadingOverlay}>
                    <Loading color={theme.buttonBg}/>
                </View>
            )}
        </View>
    );
};

export default ChannelSummarySheet;
