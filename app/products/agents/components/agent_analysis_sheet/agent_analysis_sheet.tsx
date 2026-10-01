// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useState} from 'react';
import {useIntl, type MessageDescriptor} from 'react-intl';
import {Alert, View} from 'react-native';

import AgentSelectorPanel from '@agents/components/channel_summary_sheet/agent_selector_panel';
import {useChannelAgentSelection} from '@agents/hooks';
import Loading from '@components/loading';
import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissBottomSheet} from '@screens/navigation';
import {getErrorMessage} from '@utils/errors';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import NoAgentsAvailable from './no_agents_available';
import PrivacyFooter from './privacy_footer';
import SelectedAgentRow from './selected_agent_row';

import type {SelectableAgent} from '@agents/types';
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

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
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

/**
 * Bottom sheet listing one-tap agent analyses for a channel or thread. The
 * response streams into the agent's DM, which the submit action switches to.
 */
const AgentAnalysisSheet = ({channelId, bots, selectedAgentId, options, onSubmit, errorTitle, testID}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const [submitting, setSubmitting] = useState(false);
    const [showAgentSelector, setShowAgentSelector] = useState(false);
    const {channelBots, selectedAgent, showPicker, pickAgent} = useChannelAgentSelection(bots, channelId, selectedAgentId);

    const handleOptionPress = usePreventDoubleTap(useCallback(async (value: string | boolean) => {
        if (submitting || !selectedAgent || typeof value !== 'string') {
            return;
        }

        setSubmitting(true);
        const {error} = await onSubmit(value, selectedAgent.username);
        if (error) {
            setSubmitting(false);
            Alert.alert(intl.formatMessage(errorTitle), getErrorMessage(error, intl));
            return;
        }

        dismissBottomSheet();
    }, [submitting, selectedAgent, onSubmit, intl, errorTitle]));

    const openAgentSelector = useCallback(() => setShowAgentSelector(true), []);
    const closeAgentSelector = useCallback(() => setShowAgentSelector(false), []);

    const handleAgentSelect = useCallback((agent: SelectableAgent) => {
        setShowAgentSelector(false);
        pickAgent(agent);
    }, [pickAgent]);

    if (channelBots.length === 0) {
        return <NoAgentsAvailable testID={`${testID}.no_agents`}/>;
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

    return (
        <BottomSheetScrollView>
            {showPicker && (
                <SelectedAgentRow
                    agent={selectedAgent}
                    disabled={submitting}
                    onPress={openAgentSelector}
                    testID={`${testID}.agent_selector`}
                />
            )}
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
            <PrivacyFooter testID={`${testID}.only_visible_to_you`}/>
            {submitting && (
                <View style={styles.loadingOverlay}>
                    <Loading color={theme.buttonBg}/>
                </View>
            )}
        </BottomSheetScrollView>
    );
};

export default AgentAnalysisSheet;
