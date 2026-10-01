// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl, type MessageDescriptor} from 'react-intl';
import {View, StyleSheet} from 'react-native';

import {useSavedAgentSelection} from '@agents/hooks';
import OptionItem from '@components/option_item';

import AnalysisSheetFrame from './analysis_sheet_frame';
import {useAnalysisSubmit} from './use_analysis_submit';

import type AiBotModel from '@agents/types/database/models/ai_bot';
import type {CompassIconName} from '@components/compass_icon';

export type AnalysisOption = {
    value: string;
    message: MessageDescriptor;
    icon: CompassIconName;
};

type Props = {
    channelId: string;
    bots: AiBotModel[];
    selectedAgentId: string;
    options: AnalysisOption[];
    onSubmit: (value: string, botUsername: string) => Promise<{error?: unknown}>;
    errorTitle: MessageDescriptor;
    testID: string;
};

const styles = StyleSheet.create({
    optionsContainer: {
        paddingVertical: 8,
    },
});

/**
 * Bottom sheet listing one-tap agent analyses for a channel or thread. The
 * response streams into the agent's DM, which the submit action switches to.
 */
const AgentAnalysisSheet = ({channelId, bots, selectedAgentId, options, onSubmit, errorTitle, testID}: Props) => {
    const intl = useIntl();
    const selection = useSavedAgentSelection(bots, selectedAgentId, channelId);
    const {submitting, runSubmit} = useAnalysisSubmit(errorTitle);
    const {selectedAgent} = selection;

    const handleOptionPress = useCallback((value: string | boolean) => {
        if (!selectedAgent || typeof value !== 'string') {
            return;
        }
        runSubmit(() => onSubmit(value, selectedAgent.username));
    }, [selectedAgent, runSubmit, onSubmit]);

    return (
        <AnalysisSheetFrame
            selection={selection}
            submitting={submitting}
            testID={testID}
        >
            <View style={styles.optionsContainer}>
                {options.map((option) => (
                    <OptionItem
                        key={option.value}
                        action={handleOptionPress}
                        label={intl.formatMessage(option.message)}
                        icon={option.icon}
                        testID={`${testID}.option.${option.value}`}
                        type='default'
                        value={option.value}
                    />
                ))}
            </View>
        </AnalysisSheetFrame>
    );
};

export default AgentAnalysisSheet;
