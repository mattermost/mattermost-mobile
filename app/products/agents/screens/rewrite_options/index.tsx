// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert, Keyboard, TextInput, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAgents, useRewrite} from '@agents/hooks';
import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {isEdgeToEdge} from '@constants/device';
import {NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidMount from '@hooks/did_mount';
import BottomSheet from '@screens/bottom_sheet';
import {dismissBottomSheet, navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {logWarning} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {Agent, RewriteAction} from '@agents/types';

const messages = defineMessages({
    errorTitle: {
        id: 'ai_rewrite.error.title',
        defaultMessage: 'AI Rewrite Error',
    },
    errorOk: {
        id: 'ai_rewrite.error.ok',
        defaultMessage: 'OK',
    },
    agentSelectorTitle: {
        id: 'ai_rewrite.agent_selector_title',
        defaultMessage: 'Select AI Agent',
    },
    selectedAgent: {
        id: 'ai_rewrite.selected_agent',
        defaultMessage: 'Selected Agent',
    },
    noAgentSelected: {
        id: 'ai_rewrite.no_agent_selected',
        defaultMessage: 'None',
    },
    generatePrompt: {
        id: 'ai_rewrite.generate_prompt',
        defaultMessage: 'Ask agents to create a message',
    },
    customPrompt: {
        id: 'ai_rewrite.custom_prompt',
        defaultMessage: 'Ask AI to edit message...',
    },
    shorten: {
        id: 'ai_rewrite.shorten',
        defaultMessage: 'Shorten',
    },
    elaborate: {
        id: 'ai_rewrite.elaborate',
        defaultMessage: 'Elaborate',
    },
    improveWriting: {
        id: 'ai_rewrite.improve_writing',
        defaultMessage: 'Improve writing',
    },
    fixSpelling: {
        id: 'ai_rewrite.fix_spelling',
        defaultMessage: 'Fix spelling and grammar',
    },
    simplify: {
        id: 'ai_rewrite.simplify',
        defaultMessage: 'Simplify',
    },
    summarize: {
        id: 'ai_rewrite.summarize',
        defaultMessage: 'Summarize',
    },
});

export type updateValueFn = (value: string | ((prevValue: string) => string)) => void;

type Props = {
    originalMessage: string;
    updateValue?: updateValueFn;
};

const CUSTOM_PROMPT_INPUT_HEIGHT = 64;
const OPTIONS_PADDING = 8;

const options: Array<{action: RewriteAction; message: typeof messages.shorten; icon: CompassIconName}> = [
    {action: 'shorten', message: messages.shorten, icon: 'text-short'},
    {action: 'elaborate', message: messages.elaborate, icon: 'text-long'},
    {action: 'improve_writing', message: messages.improveWriting, icon: 'auto-fix'},
    {action: 'fix_spelling', message: messages.fixSpelling, icon: 'spellcheck'},
    {action: 'simplify', message: messages.simplify, icon: 'creation-outline'},
    {action: 'summarize', message: messages.summarize, icon: 'ai-summarize'},
];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
    },
    headerContainer: {
        gap: 4,
    },
    customPromptContainer: {},
    customPromptInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 4,
    },
    customPromptIcon: {
        marginTop: 4,
    },
    customPromptInput: {
        flex: 1,
        color: theme.centerChannelColor,
        includeFontPadding: false,
        ...typography('Body', 200),
        textAlignVertical: 'center',
        verticalAlign: 'middle',
        justifyContent: 'center',
    },
    optionsContainer: {
        paddingTop: OPTIONS_PADDING,
    },
    bottomSheetContent: {
        paddingTop: 10,
    },
}));

const RewriteOptions = ({
    originalMessage,
    updateValue,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const insets = useSafeAreaInsets();
    const {startRewrite} = useRewrite();

    const [customPrompt, setCustomPrompt] = useState('');
    const agents = useAgents(serverUrl);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const textInputRef = useRef<TextInput>(null);

    // Set default agent when agents list changes
    useEffect(() => {
        if (agents.length > 0) {
            setSelectedAgent((current) => current || agents[0]);
        }
    }, [agents]);

    useDidMount(() => {
        return () => {
            CallbackStore.removeCallback();
        };
    });

    const closeBottomSheet = useCallback(async () => {
        await dismissBottomSheet();
    }, []);

    useAndroidHardwareBackHandler(Screens.AGENTS_REWRITE_OPTIONS, closeBottomSheet);

    const handleRewriteSuccess = useCallback((rewrittenText: string) => {
        updateValue?.(rewrittenText);
    }, [updateValue]);

    const handleRewriteError = useCallback((errorMsg: string) => {
        Alert.alert(
            intl.formatMessage(messages.errorTitle),
            errorMsg,
            [{
                text: intl.formatMessage(messages.errorOk),
            }],
        );
    }, [intl]);

    const handleRewrite = useCallback(async (action: RewriteAction, prompt?: string) => {
        Keyboard.dismiss();

        // Determine if we're generating new content or editing existing content
        const isGenerating = !originalMessage || !originalMessage.trim();

        // For content generation, we need a custom prompt
        if (isGenerating && (!prompt || !prompt.trim())) {
            logWarning('[RewriteOptions] Content generation called without prompt');
            return;
        }

        // For generation, pass empty string as message and use prompt; for editing, use original message
        const messageToProcess = isGenerating ? '' : originalMessage;
        const agentId = selectedAgent?.id;

        const triggerRewrite = () => {
            startRewrite(
                serverUrl,
                messageToProcess,
                action,
                prompt,
                agentId,
                handleRewriteSuccess,
                handleRewriteError,
            );
        };

        // Close the bottom sheet first, then start rewrite
        try {
            await closeBottomSheet();
            triggerRewrite();
        } catch (e) {
            logWarning('[RewriteOptions] Error closing bottom sheet:', e);

            // Still try to start the rewrite even if sheet close failed
            triggerRewrite();
        }
    }, [originalMessage, serverUrl, closeBottomSheet, selectedAgent, startRewrite, handleRewriteSuccess, handleRewriteError]);

    // Determine if we're in generation mode (empty original message means user wants to generate new content)
    const isInGenerationMode = !originalMessage || !originalMessage.trim();

    // Auto-focus the text input when in generation mode
    useEffect(() => {
        if (isInGenerationMode) {
            // Small delay to ensure the bottom sheet has finished animating
            const timer = setTimeout(() => {
                textInputRef.current?.focus();
            }, 300);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isInGenerationMode]);

    const handleCustomPromptSubmit = useCallback(() => {
        Keyboard.dismiss();

        if (customPrompt && customPrompt.trim()) {
            handleRewrite('custom', customPrompt);
        }
    }, [customPrompt, handleRewrite]);

    const handleOpenAgentSelector = useCallback(() => {
        const onSelectAgent = (agent: Agent) => {
            setSelectedAgent(agent);
        };
        CallbackStore.setCallback(onSelectAgent);
        navigateToScreen(Screens.AGENTS_SELECTOR, {agents, selectedAgentId: selectedAgent?.id || ''});
    }, [agents, selectedAgent]);

    const snapPoints = useMemo(() => {
        const paddingBottom = 10;

        // Add agent selector height if multiple agents available
        const agentSelectorHeight = agents.length > 1 ? ITEM_HEIGHT : 0;

        // Use the same height for both generation and editing modes
        const optionsHeight = OPTIONS_PADDING + bottomSheetSnapPoint(6, ITEM_HEIGHT);
        const bottom = isEdgeToEdge ? insets.bottom : NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN;
        const COMPONENT_HEIGHT = agentSelectorHeight + CUSTOM_PROMPT_INPUT_HEIGHT + optionsHeight + paddingBottom + bottom;

        return [1, COMPONENT_HEIGHT];
    }, [agents.length, insets.bottom]);

    const renderContent = useCallback(() => (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                {agents.length > 1 && (
                    <OptionItem
                        label={intl.formatMessage(messages.selectedAgent)}
                        info={selectedAgent?.displayName || intl.formatMessage(messages.noAgentSelected)}
                        action={handleOpenAgentSelector}
                        type='arrow'
                        testID='ai_rewrite.select_agent'
                    />
                )}

                <View style={styles.customPromptContainer}>
                    <View style={styles.customPromptInputWrapper}>
                        <CompassIcon
                            name='creation-outline'
                            size={20}
                            color={changeOpacity(theme.centerChannelColor, 0.64)}
                            style={styles.customPromptIcon}
                        />
                        <TextInput
                            ref={textInputRef}
                            style={styles.customPromptInput}
                            placeholder={intl.formatMessage(isInGenerationMode ? messages.generatePrompt : messages.customPrompt)}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.64)}
                            value={customPrompt}
                            onChangeText={setCustomPrompt}
                            onSubmitEditing={handleCustomPromptSubmit}
                            returnKeyType='send'
                            multiline={false}
                            autoCapitalize='none'
                        />
                    </View>
                </View>
            </View>

            {!isInGenerationMode && (
                <View style={styles.optionsContainer}>
                    {options.map((option) => (
                        <OptionItem
                            key={option.action}
                            label={intl.formatMessage(option.message)}
                            icon={option.icon}
                            action={() => handleRewrite(option.action)}
                            type='default'
                            testID={`ai_rewrite.option.${option.action}`}
                        />
                    ))}
                </View>
            )}
        </View>
    ), [styles, agents, intl, selectedAgent, handleOpenAgentSelector, theme, isInGenerationMode, customPrompt, handleCustomPromptSubmit, handleRewrite]);

    return (
        <BottomSheet
            renderContent={renderContent}
            screen={Screens.AGENTS_REWRITE_OPTIONS}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            keyboardBehavior='fillParent'
            keyboardBlurBehavior='none'
            testID='ai_rewrite_options'
            contentStyle={styles.bottomSheetContent}
        />
    );
};

export default RewriteOptions;
