// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {defineMessages, useIntl, type MessageDescriptor} from 'react-intl';
import {Alert, Pressable, Text, View} from 'react-native';

import {fetchAIBots} from '@agents/actions/remote/bots';
import {requestChannelInterval} from '@agents/actions/remote/channel_interval';
import {saveSelectedAgent} from '@agents/actions/remote/preference';
import AgentSelectorPanel from '@agents/components/channel_summary_sheet/agent_selector_panel';
import {CHANNEL_INTERVAL_PRESETS, type ChannelIntervalPreset} from '@agents/constants';
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

type PresetOption = {
    preset: ChannelIntervalPreset;
    message: MessageDescriptor;
    icon: CompassIconName;
};

const messages = defineMessages({
    summarizeUnreads: {id: 'agents.unreads_summarize.option.summarize_unreads', defaultMessage: 'Summarize new messages'},
    actionItems: {id: 'agents.unreads_summarize.option.action_items', defaultMessage: 'Find action items'},
    openQuestions: {id: 'agents.unreads_summarize.option.open_questions', defaultMessage: 'Find open questions'},
    errorTitle: {id: 'agents.unreads_summarize.error_title', defaultMessage: 'Unable to run analysis'},
});

// Mirrors the plugin webapp's Ask AI menu on the New Messages separator
// (unreads_summarize.tsx).
const PRESET_OPTIONS: PresetOption[] = [
    {preset: CHANNEL_INTERVAL_PRESETS.SUMMARIZE_UNREADS, message: messages.summarizeUnreads, icon: 'ai-summarize'},
    {preset: CHANNEL_INTERVAL_PRESETS.ACTION_ITEMS, message: messages.actionItems, icon: 'check-circle-outline'},
    {preset: CHANNEL_INTERVAL_PRESETS.OPEN_QUESTIONS, message: messages.openQuestions, icon: 'help-circle-outline'},
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
    channelId: string;

    // The same value the New Messages separator is drawn from, so the summary
    // window matches what the user sees on screen.
    lastViewedAt: number;
    bots: AiBotModel[];
    selectedAgentId: string;
};

const UnreadsSummarizeSheet = ({channelId, lastViewedAt, bots, selectedAgentId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [submitting, setSubmitting] = useState(false);
    const [showAgentSelector, setShowAgentSelector] = useState(false);

    // Only offer agents the server will accept for this channel; the interval
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

    const handleOptionPress = useCallback(async (optionPreset: string | boolean) => {
        if (submitting || !selectedAgent) {
            return;
        }

        const option = PRESET_OPTIONS.find((o) => o.preset === optionPreset);
        if (!option) {
            return;
        }

        setSubmitting(true);
        const {error} = await requestChannelInterval(serverUrl, channelId, lastViewedAt, option.preset, selectedAgent.username);

        if (error) {
            setSubmitting(false);
            Alert.alert(
                intl.formatMessage(messages.errorTitle),
                getErrorMessage(error, intl),
            );
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, channelId, lastViewedAt, selectedAgent, intl, submitting]);

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
                        testID='agents.unreads_summarize.no_agents'
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
                    testID='agents.unreads_summarize.agent_selector'
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
                {PRESET_OPTIONS.map((option) => (
                    <OptionItem
                        key={option.preset}
                        action={handleOptionPressDebounced}
                        label={intl.formatMessage(option.message)}
                        icon={option.icon}
                        testID={`agents.unreads_summarize.option.${option.preset}`}
                        type='default'
                        value={option.preset}
                    />
                ))}
            </View>

            <FormattedText
                id='agents.channel_summary.only_visible_to_you'
                defaultMessage='Agents post responses in a direct message which will only be visible to you.'
                style={styles.privacyFooter}
                testID='agents.unreads_summarize.only_visible_to_you'
            />

            {submitting && (
                <View style={styles.loadingOverlay}>
                    <Loading color={theme.buttonBg}/>
                </View>
            )}
        </BottomSheetScrollView>
    );
};

export default UnreadsSummarizeSheet;
