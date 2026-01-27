// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo} from 'react';
import {Platform, type ListRenderItemInfo, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import BottomSheet from '@screens/bottom_sheet';
import {dismissModal} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';

import AgentItem from './agent_item';

import type {Agent} from '@agents/types';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    closeButtonId: string;
    agents: Agent[];
    selectedAgentId: string;
    onSelectAgent: (agent: Agent) => void;
};

const OPTIONS_PADDING = 12;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexGrow: 1,
        backgroundColor: theme.centerChannelBg,
    },
    contentContainer: {
        paddingTop: OPTIONS_PADDING,
    },
}));

const keyExtractor = (item: Agent) => item.id;

const AgentSelector = ({
    componentId,
    closeButtonId,
    agents,
    selectedAgentId,
    onSelectAgent,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const isTablet = useIsTablet();
    const {enabled, panResponder} = useBottomSheetListsFix();

    const close = useCallback(() => {
        dismissModal({componentId});
    }, [componentId]);

    useNavButtonPressed(closeButtonId, componentId, close, []);
    useAndroidHardwareBackHandler(componentId, close);

    const handleSelectAgent = useCallback((agent: Agent) => {
        onSelectAgent(agent);
        close();
    }, [onSelectAgent, close]);

    const List = useMemo(() => (isTablet ? FlatList : BottomSheetFlatList), [isTablet]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<Agent>) => (
        <AgentItem
            agent={item}
            selectedAgentId={selectedAgentId}
            onSelect={handleSelectAgent}
        />
    ), [selectedAgentId, handleSelectAgent]);

    const snapPoints = useMemo(() => {
        const paddingBottom = 10;
        const bottomSheetAdjust = Platform.select({ios: 5, default: 20});

        // Calculate height based on number of agents
        const optionsHeight = OPTIONS_PADDING + bottomSheetSnapPoint(agents.length, ITEM_HEIGHT);
        const componentHeight = optionsHeight + paddingBottom + bottomSheetAdjust;

        const points: Array<string | number> = [1, componentHeight];

        // Add scrollable snap point if there are many agents
        if (agents.length > 5) {
            points.push('80%');
        }

        return points;
    }, [agents.length]);

    const renderContent = () => (
        <View style={styles.container}>
            <List
                data={agents}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.contentContainer}
                testID='ai_agent_selector.flat_list'
                scrollEnabled={enabled}
                {...panResponder.panHandlers}
            />
        </View>
    );

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={Screens.AGENTS_SELECTOR}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            testID='ai_agent_selector'
        />
    );
};

export default AgentSelector;
