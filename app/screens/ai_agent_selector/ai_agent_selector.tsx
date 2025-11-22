// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Platform, View} from 'react-native';

import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import BottomSheet from '@screens/bottom_sheet';
import {dismissModal} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {AIAgent} from '@typings/api/ai';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    closeButtonId: string;
    agents: AIAgent[];
    selectedAgentId: string;
    onSelectAgent: (agent: AIAgent) => void;
}

const OPTIONS_PADDING = 12;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
    },
    optionsContainer: {
        paddingTop: OPTIONS_PADDING,
    },
}));

const AIAgentSelector = ({
    componentId,
    closeButtonId,
    agents,
    selectedAgentId,
    onSelectAgent,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const close = useCallback(() => {
        dismissModal({componentId});
    }, [componentId]);

    useNavButtonPressed(closeButtonId, componentId, close, []);
    useAndroidHardwareBackHandler(componentId, close);

    const handleSelectAgent = useCallback((agent: AIAgent) => {
        onSelectAgent(agent);
        close();
    }, [onSelectAgent, close]);

    const snapPoints = useMemo(() => {
        const paddingBottom = 10;
        const bottomSheetAdjust = Platform.select({ios: 5, default: 20});

        // Calculate height based on number of agents
        const optionsHeight = OPTIONS_PADDING + bottomSheetSnapPoint(agents.length, ITEM_HEIGHT);
        const componentHeight = optionsHeight + paddingBottom + bottomSheetAdjust;

        return [1, componentHeight];
    }, [agents.length]);

    const renderContent = () => (
        <View style={styles.container}>
            <View style={styles.optionsContainer}>
                {agents.map((agent) => (
                    <OptionItem
                        key={agent.id}
                        label={agent.displayName}
                        description={`@${agent.username} • ${agent.service_type}`}
                        action={() => handleSelectAgent(agent)}
                        type='radio'
                        selected={agent.id === selectedAgentId}
                        testID={`ai_agent_selector.agent.${agent.id}`}
                        descriptionNumberOfLines={1}
                    />
                ))}
            </View>
        </View>
    );

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={Screens.AI_AGENT_SELECTOR}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            scrollable={true}
            testID='ai_agent_selector'
        />
    );
};

export default AIAgentSelector;

