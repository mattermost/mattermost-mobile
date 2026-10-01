// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {defineMessages, useIntl, type MessageDescriptor} from 'react-intl';
import {Pressable, View} from 'react-native';

import {requestChannelSummary} from '@agents/actions/remote/channel_summary';
import AnalysisSheetFrame from '@agents/components/agent_analysis_sheet/analysis_sheet_frame';
import {useAnalysisSubmit} from '@agents/components/agent_analysis_sheet/use_analysis_submit';
import {CHANNEL_ANALYSIS_TYPES} from '@agents/constants';
import {useChannelAgentSelection} from '@agents/hooks';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import DateRangePicker from './date_range_picker';

import type {ChannelAnalysisOptions} from '@agents/types/api';
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

const UNREADS_OPTION: SummaryOption = {id: 'unreads', message: messages.unreads};
const RANGE_OPTIONS: SummaryOption[] = [
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
    promptWrapper: {
        paddingTop: 8,
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
}));

const ChannelSummarySheet = ({channelId, bots, selectedAgentId, viewedAt}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [customPrompt, setCustomPrompt] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const selection = useChannelAgentSelection(bots, channelId, selectedAgentId);
    const {submitting, runSubmit} = useAnalysisSubmit(messages.errorTitle);
    const {selectedAgent} = selection;

    const trimmedPrompt = customPrompt.trim();

    // Without a previous visit there is no unread window to bound the summary,
    // and an unbounded `since` would summarize the whole channel history.
    const options = useMemo(() => (viewedAt ? [UNREADS_OPTION, ...RANGE_OPTIONS] : RANGE_OPTIONS), [viewedAt]);

    const submit = useCallback((analysisType: string, analysisOptions: ChannelAnalysisOptions) => {
        if (!selectedAgent) {
            return;
        }
        runSubmit(() => requestChannelSummary(serverUrl, channelId, analysisType, selectedAgent.username, {
            ...analysisOptions,
            prompt: trimmedPrompt || undefined,
        }));
    }, [serverUrl, channelId, selectedAgent, trimmedPrompt, runSubmit]);

    const handleOptionPress = useCallback((optionId: string | boolean) => {
        const option = options.find((o) => o.id === optionId);
        if (!option) {
            return;
        }

        if (option.id === 'custom') {
            setShowDatePicker(true);
            return;
        }

        if (option.id === 'unreads') {
            submit(CHANNEL_ANALYSIS_TYPES.SUMMARIZE_UNREADS, {since: new Date(viewedAt).toISOString()});
            return;
        }

        submit(CHANNEL_ANALYSIS_TYPES.DAYS, {days: option.days});
    }, [options, submit, viewedAt]);

    const handleCustomPromptSubmit = usePreventDoubleTap(useCallback(() => {
        if (trimmedPrompt) {
            submit(CHANNEL_ANALYSIS_TYPES.CUSTOM, {});
        }
    }, [trimmedPrompt, submit]));

    const handleDateRangeSubmit = useCallback((since: Date, until: Date) => {
        setShowDatePicker(false);

        // Normalize to UTC start/end of day to avoid missing data due to timezone conversion
        const sinceUtc = new Date(Date.UTC(since.getFullYear(), since.getMonth(), since.getDate(), 0, 0, 0));
        const untilUtc = new Date(Date.UTC(until.getFullYear(), until.getMonth(), until.getDate(), 23, 59, 59));
        submit(CHANNEL_ANALYSIS_TYPES.DATE_RANGE, {since: sinceUtc.toISOString(), until: untilUtc.toISOString()});
    }, [submit]);

    const closeDatePicker = useCallback(() => setShowDatePicker(false), []);

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
        <AnalysisSheetFrame
            selection={selection}
            submitting={submitting}
            testID='agents.channel_summary'
        >
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

            <View style={styles.optionsContainer}>
                {options.map((option) => (
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
        </AnalysisSheetFrame>
    );
};

export default ChannelSummarySheet;
