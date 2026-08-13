// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo, useRef} from 'react';
import {type ListRenderItemInfo, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {isEdgeToEdge} from '@constants/device';
import {NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN} from '@constants/view';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidMount from '@hooks/did_mount';
import BottomSheet, {type BottomSheetRef} from '@screens/bottom_sheet';
import CallbackStore from '@store/callback_store';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';

import AgentItem from './agent_item';

import type {Agent} from '@agents/types';

export type Props = {
    agents: Agent[];
    selectedAgentId: string;
    onSelectAgent?: (agent: Agent) => void;
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
    agents,
    selectedAgentId,
    onSelectAgent,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<BottomSheetRef>(null);

    useDidMount(() => {
        return () => {
            CallbackStore.removeCallback();
        };
    });

    const close = useCallback(async () => {
        bottomSheetRef.current?.close();
        await new Promise((resolve) => setTimeout(resolve, 250));
    }, []);

    useAndroidHardwareBackHandler(Screens.AGENTS_SELECTOR, close);

    const handleSelectAgent = useCallback((agent: Agent) => {
        onSelectAgent?.(agent);
        close();
    }, [onSelectAgent, close]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<Agent>) => (
        <AgentItem
            agent={item}
            selectedAgentId={selectedAgentId}
            onSelect={handleSelectAgent}
        />
    ), [selectedAgentId, handleSelectAgent]);

    const snapPoints = useMemo(() => {
        const paddingBottom = 10;

        // Calculate height based on number of agents
        const optionsHeight = OPTIONS_PADDING + bottomSheetSnapPoint(agents.length, ITEM_HEIGHT);
        const bottom = isEdgeToEdge ? insets.bottom : NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN;
        const componentHeight = optionsHeight + paddingBottom + bottom;

        const points: Array<string | number> = [1, componentHeight];

        // Add scrollable snap point if there are many agents
        if (agents.length > 5) {
            points.push('80%');
        }

        return points;
    }, [agents.length, insets.bottom]);

    const renderContent = () => (
        <View style={styles.container}>
            <BottomSheetFlatList
                data={agents}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.contentContainer}
                testID='ai_agent_selector.flat_list'
            />
        </View>
    );

    return (
        <BottomSheet
            ref={bottomSheetRef}
            renderContent={renderContent}
            screen={Screens.AGENTS_SELECTOR}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            testID='ai_agent_selector'
        />
    );
};

export default AgentSelector;
