// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useState, type ReactNode} from 'react';
import {View} from 'react-native';

import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AgentSelectorPanel from './agent_selector_panel';
import NoAgentsAvailable from './no_agents_available';
import PrivacyFooter from './privacy_footer';
import SelectedAgentRow from './selected_agent_row';

import type {useChannelAgentSelection} from '@agents/hooks';
import type {SelectableAgent} from '@agents/types';

type Props = {
    selection: ReturnType<typeof useChannelAgentSelection>;
    submitting: boolean;
    testID: string;
    children: ReactNode;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
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
 * Shared chrome for the agent analysis sheets: the empty state, the agent
 * picker, the privacy disclosure, and the overlay shown while a request runs.
 */
const AnalysisSheetFrame = ({selection, submitting, testID, children}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [showAgentSelector, setShowAgentSelector] = useState(false);
    const {channelBots, selectedAgent, showPicker, pickAgent} = selection;

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
            {children}
            <PrivacyFooter testID={`${testID}.only_visible_to_you`}/>
            {submitting && (
                <View style={styles.loadingOverlay}>
                    <Loading color={theme.buttonBg}/>
                </View>
            )}
        </BottomSheetScrollView>
    );
};

export default AnalysisSheetFrame;
