// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl, type MessageDescriptor} from 'react-intl';
import {Alert, Pressable, View} from 'react-native';

import {requestChannelSummary, type ChannelSummaryRequestOptions} from '@agents/actions/remote/channel_summary';
import NoAgentsAvailable from '@agents/components/agent_analysis_sheet/no_agents_available';
import PrivacyFooter from '@agents/components/agent_analysis_sheet/privacy_footer';
import SelectedAgentRow from '@agents/components/agent_analysis_sheet/selected_agent_row';
import {AGENT_ANALYSIS_SUMMARY} from '@agents/constants';
import {useChannelAgentSelection} from '@agents/hooks';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import Loading from '@components/loading';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissBottomSheet} from '@screens/navigation';
import {getErrorMessage} from '@utils/errors';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AgentSelectorPanel from './agent_selector_panel';
import DateRangePicker from './date_range_picker';

import type {SelectableAgent} from '@agents/types';
import type AiBotModel from '@agents/types/database/models/ai_bot';

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
    promptPlaceholder: {id: 'agents.channel_summary.ai_prompt_placeholder', defaultMessage: 'Ask AI about this channel'},
    errorTitle: {id: 'agents.channel_summary.error_title', defaultMessage: 'Unable to start summary'},
});

const SUMMARY_OPTIONS: SummaryOption[] = [
    {id: 'unreads', message: messages.unreads},
    {id: '7d', days: 7, message: messages.sevenDays},
    {id: '14d', days: 14, message: messages.fourteenDays},
    {id: 'custom', message: messages.custom, showChevron: true},
];

type Props = {
    channelId: string;
    bots: AiBotModel[];
    selectedAgentId: string;

    // The channel member's viewedAt — the pre-entry timestamp that drives the
    // New Messages line. lastViewedAt is useless here: opening the channel
    // already advanced it to "now", which would make the unread window empty.
    viewedAt: number;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    headerSection: {
        gap: 4,
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
}));

const ChannelSummarySheet = ({channelId, bots, selectedAgentId, viewedAt}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [customPrompt, setCustomPrompt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showAgentSelector, setShowAgentSelector] = useState(false);

    const {channelBots, selectedAgent, showPicker, pickAgent} = useChannelAgentSelection(bots, channelId, selectedAgentId);

    const trimmedPrompt = customPrompt.trim();

    const submit = useCallback(async (options: ChannelSummaryRequestOptions) => {
        if (!selectedAgent) {
            return;
        }

        setSubmitting(true);
        const {error} = await requestChannelSummary(serverUrl, channelId, AGENT_ANALYSIS_SUMMARY, selectedAgent.username, {
            ...options,
            prompt: trimmedPrompt || undefined,
        });

        if (error) {
            setSubmitting(false);
            Alert.alert(intl.formatMessage(messages.errorTitle), getErrorMessage(error, intl));
            return;
        }

        dismissBottomSheet();
    }, [serverUrl, channelId, selectedAgent, trimmedPrompt, intl]);

    const handleOptionPress = useCallback((optionId: string | boolean) => {
        const option = SUMMARY_OPTIONS.find((o) => o.id === optionId);
        if (submitting || !option) {
            return;
        }

        if (option.id === 'custom') {
            setShowDatePicker(true);
            return;
        }

        if (option.id === 'unreads') {
            submit({sinceLastViewed: true, viewedAt});
            return;
        }

        submit({days: option.days});
    }, [submitting, submit, viewedAt]);

    const handleCustomPromptSubmit = usePreventDoubleTap(useCallback(() => {
        if (trimmedPrompt) {
            submit({});
        }
    }, [trimmedPrompt, submit]));

    const handleDateRangeSubmit = usePreventDoubleTap(useCallback((since: Date, until: Date) => {
        setShowDatePicker(false);

        // Normalize to UTC start/end of day to avoid missing data due to timezone conversion
        const sinceUtc = new Date(Date.UTC(since.getFullYear(), since.getMonth(), since.getDate(), 0, 0, 0));
        const untilUtc = new Date(Date.UTC(until.getFullYear(), until.getMonth(), until.getDate(), 23, 59, 59));
        submit({since: sinceUtc.toISOString(), until: untilUtc.toISOString()});
    }, [submit]));

    const closeDatePicker = useCallback(() => setShowDatePicker(false), []);
    const openAgentSelector = useCallback(() => setShowAgentSelector(true), []);
    const closeAgentSelector = useCallback(() => setShowAgentSelector(false), []);

    const handleAgentSelect = useCallback((agent: SelectableAgent) => {
        setShowAgentSelector(false);
        pickAgent(agent);
    }, [pickAgent]);

    if (channelBots.length === 0) {
        return <NoAgentsAvailable testID='agents.channel_summary.no_agents'/>;
    }

    if (showAgentSelector) {
        return (
            <AgentSelectorPanel
                agents={channelBots}
                currentAgentUsername={selectedAgent?.username ?? ''}
                onSelectAgent={handleAgentSelect}
                onBack={closeAgentSelector}
            />
        );
    }

    if (showDatePicker) {
        return (
            <DateRangePicker
                onSubmit={handleDateRangeSubmit}
                onCancel={closeDatePicker}
            />
        );
    }

    const canSubmitPrompt = trimmedPrompt !== '' && !submitting;

    return (
        <BottomSheetScrollView>
            <View style={styles.headerSection}>
                {showPicker && (
                    <SelectedAgentRow
                        agent={selectedAgent}
                        disabled={submitting}
                        onPress={openAgentSelector}
                        testID='agents.channel_summary.agent_selector'
                    />
                )}
                <View style={styles.promptWrapper}>
                    <FloatingTextInput
                        label={intl.formatMessage(messages.promptPlaceholder)}
                        theme={theme}
                        value={customPrompt}
                        onChangeText={setCustomPrompt}
                        testID='agents.channel_summary.prompt_input'
                        editable={!submitting}
                        onSubmitEditing={handleCustomPromptSubmit}
                        returnKeyType='send'
                        endAdornment={
                            <Pressable
                                onPress={handleCustomPromptSubmit}
                                style={({pressed}) => [
                                    styles.sendButton,
                                    !canSubmitPrompt && styles.sendButtonDisabled,
                                    pressed && {opacity: 0.72},
                                ]}
                                disabled={!canSubmitPrompt}
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

            <PrivacyFooter testID='agents.channel_summary.only_visible_to_you'/>

            {submitting && (
                <View style={styles.loadingOverlay}>
                    <Loading color={theme.buttonBg}/>
                </View>
            )}
        </BottomSheetScrollView>
    );
};

export default ChannelSummarySheet;
