// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, type ListRenderItemInfo, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchCustomPrompts, renderCustomPrompt} from '@agents/actions/remote/custom_prompts';
import {customPromptErrorMessages} from '@agents/components/custom_prompt_pills';
import {useCustomPromptsState} from '@agents/store/custom_prompts_store';
import {buildCustomPromptDraft} from '@agents/utils';
import FormattedText from '@components/formatted_text';
import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {isEdgeToEdge} from '@constants/device';
import {NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidMount from '@hooks/did_mount';
import BottomSheet, {type BottomSheetRef} from '@screens/bottom_sheet';
import {dismissBottomSheet} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import PromptItem from './prompt_item';

import type {CustomPrompt} from '@agents/types/api';

export type Props = {
    channelId: string;
    botUsername: string;
    isBotDMChannel: boolean;
    updateValue?: (value: string) => void;
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
    emptyText: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        paddingVertical: 12,
        ...typography('Body', 200),
    },
}));

const keyExtractor = (item: CustomPrompt) => item.id;

/**
 * Bottom-sheet list of all custom prompts visible to the user, opened from
 * the composer AI-actions sheet. Selecting a prompt renders it server-side
 * and inserts the result into the composer draft for review before sending
 * (webapp parity: custom_prompts_dropdown.tsx).
 */
const CustomPromptList = ({
    channelId,
    botUsername,
    isBotDMChannel,
    updateValue,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const {height: windowHeight} = useWindowDimensions();

    const {prompts} = useCustomPromptsState(serverUrl);
    const [renderingId, setRenderingId] = useState<string | null>(null);
    const bottomSheetRef = useRef<BottomSheetRef>(null);

    useDidMount(() => {
        fetchCustomPrompts(serverUrl);
        return () => {
            CallbackStore.removeCallback();
        };
    });

    // Close only this sheet, returning to the AI-actions sheet beneath it.
    const close = useCallback(async () => {
        bottomSheetRef.current?.close();
        await new Promise((resolve) => setTimeout(resolve, 250));
    }, []);

    useAndroidHardwareBackHandler(Screens.AGENTS_CUSTOM_PROMPTS, close);

    const handleSelectPrompt = useCallback(async (prompt: CustomPrompt) => {
        if (renderingId) {
            return;
        }
        setRenderingId(prompt.id);

        const {data: rendered, error} = await renderCustomPrompt(serverUrl, prompt.id, {
            channel_id: channelId,
            bot_username: botUsername || undefined,
        });

        setRenderingId(null);

        if (error || rendered === undefined) {
            Alert.alert(
                intl.formatMessage(customPromptErrorMessages.errorTitle),
                intl.formatMessage(customPromptErrorMessages.errorMessage),
            );
            return;
        }

        updateValue?.(buildCustomPromptDraft(rendered, botUsername || undefined, isBotDMChannel));

        // Close the whole sheet stack (this list and the AI-actions sheet
        // beneath it) so the user lands back on the composer draft.
        await dismissBottomSheet();
    }, [renderingId, serverUrl, channelId, botUsername, isBotDMChannel, updateValue, intl]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<CustomPrompt>) => (
        <PromptItem
            prompt={item}
            rendering={renderingId === item.id}
            disabled={renderingId !== null}
            onSelect={handleSelectPrompt}
        />
    ), [renderingId, handleSelectPrompt]);

    const renderEmpty = useCallback(() => (
        <FormattedText
            id='agents.custom_prompts.empty'
            defaultMessage='No custom prompts yet'
            style={styles.emptyText}
            testID='agents.custom_prompts.list.empty'
        />
    ), [styles.emptyText]);

    const snapPoints = useMemo(() => {
        const paddingBottom = 10;

        const optionsHeight = OPTIONS_PADDING + bottomSheetSnapPoint(Math.max(prompts.length, 1), ITEM_HEIGHT);
        const bottom = isEdgeToEdge ? insets.bottom : NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN;

        // Clamp to 80% of the window so long lists scroll within the sheet
        // and the snap points always stay strictly ascending, even on small
        // screens where the content height could exceed the window.
        const maxHeight = windowHeight * 0.8;
        const componentHeight = Math.min(optionsHeight + paddingBottom + bottom, maxHeight);

        return [1, componentHeight];
    }, [prompts.length, insets.bottom, windowHeight]);

    const renderContent = () => (
        <View style={styles.container}>
            <BottomSheetFlatList
                data={prompts}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.contentContainer}
                testID='agents.custom_prompts.list'
            />
        </View>
    );

    return (
        <BottomSheet
            ref={bottomSheetRef}
            renderContent={renderContent}
            screen={Screens.AGENTS_CUSTOM_PROMPTS}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            testID='agents_custom_prompts'
        />
    );
};

export default CustomPromptList;
