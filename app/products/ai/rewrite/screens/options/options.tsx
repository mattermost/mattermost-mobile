// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert, Keyboard, Platform, TextInput, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import BottomSheet from '@screens/bottom_sheet';
import {dismissBottomSheet, openAsBottomSheet} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {logWarning} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {useAIRewrite} from '../../hooks';

import type {AIAgent, AIRewriteAction} from '../../types';
import type {AvailableScreens} from '@typings/screens/navigation';

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

type Props = {
    closeButtonId: string;
    componentId: AvailableScreens;
    originalMessage: string;
    updateValue: (value: string | ((prevValue: string) => string)) => void;
};

const CUSTOM_PROMPT_INPUT_HEIGHT = 56;
const OPTIONS_PADDING = 8;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
    },
    headerContainer: {
        paddingTop: 8,
        paddingBottom: 4,
        gap: 8,
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
        gap: 8,
    },
    customPromptInput: {
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
        color: theme.centerChannelColor,
        padding: 0,
        margin: 0,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    optionsContainer: {
        paddingTop: OPTIONS_PADDING,
    },
}));

const RewriteOptions = ({
    closeButtonId,
    componentId,
    originalMessage,
    updateValue,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const {startRewrite} = useAIRewrite();

    const [customPrompt, setCustomPrompt] = useState('');
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const textInputRef = useRef<TextInput>(null);

    // Get agents from EphemeralStore on mount and subscribe to changes
    useEffect(() => {
        const availableAgents = EphemeralStore.getAIAgents(serverUrl);
        setAgents(availableAgents);

        // Set default agent (first one)
        if (availableAgents.length > 0) {
            setSelectedAgent(availableAgents[0]);
        }

        const handleAgentsUpdate = (updatedAgents: AIAgent[]) => {
            setAgents(updatedAgents);

            // Auto-select first agent if none selected
            if (updatedAgents.length > 0) {
                setSelectedAgent((current) => current || updatedAgents[0]);
            }
        };

        // Subscribe to agent updates
        const subscription = EphemeralStore.observeAIAgents(serverUrl).subscribe(handleAgentsUpdate);

        return () => subscription.unsubscribe();
    }, [serverUrl]);

    const closeBottomSheet = useCallback(async () => {
        try {
            await dismissBottomSheet(Screens.AI_REWRITE_OPTIONS);
        } catch (e) {
            // If dismissal fails, log but don't throw
            logWarning('Failed to dismiss AI rewrite bottom sheet:', e);
        }
    }, []);

    useNavButtonPressed(closeButtonId, componentId, closeBottomSheet, []);
    useAndroidHardwareBackHandler(componentId, closeBottomSheet);

    // Track keyboard visibility
    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setIsKeyboardVisible(true),
        );
        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setIsKeyboardVisible(false),
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, []);

    const handleRewriteSuccess = useCallback((rewrittenText: string) => {
        updateValue(rewrittenText);
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

    const handleRewrite = useCallback((action: AIRewriteAction, prompt?: string) => {
        // Only dismiss keyboard if it's actually visible to prevent unwanted animations
        if (isKeyboardVisible) {
            Keyboard.dismiss();
        }

        // Determine if we're generating new content or editing existing content
        const isGenerating = !originalMessage || !originalMessage.trim();

        // For content generation, we need a custom prompt
        if (isGenerating && (!prompt || !prompt.trim())) {
            logWarning('AI content generation called without prompt');
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
        closeBottomSheet().then(triggerRewrite).catch((e) => {
            logWarning('Error closing bottom sheet:', e);

            // Still try to start the rewrite even if sheet close failed
            triggerRewrite();
        });
    }, [originalMessage, serverUrl, closeBottomSheet, selectedAgent, isKeyboardVisible, startRewrite, handleRewriteSuccess, handleRewriteError]);

    // Determine if we're in generation mode (empty original message)
    const isGeneratingContent = !originalMessage || !originalMessage.trim();

    // Auto-focus the text input when in generation mode
    useEffect(() => {
        if (isGeneratingContent) {
            // Small delay to ensure the bottom sheet has finished animating
            const timer = setTimeout(() => {
                textInputRef.current?.focus();
            }, 300);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isGeneratingContent]);

    const handleCustomPromptSubmit = useCallback(() => {
        // Only dismiss keyboard if it's visible when user submits
        if (isKeyboardVisible) {
            Keyboard.dismiss();
        }

        if (customPrompt && customPrompt.trim()) {
            handleRewrite('custom', customPrompt);
        }
    }, [customPrompt, handleRewrite, isKeyboardVisible]);

    const isTablet = useIsTablet();

    const handleOpenAgentSelector = useCallback(() => {
        const title = isTablet ? intl.formatMessage(messages.agentSelectorTitle) : '';

        openAsBottomSheet({
            closeButtonId: 'close-agent-selector',
            screen: Screens.AI_AGENT_SELECTOR,
            theme,
            title,
            props: {
                closeButtonId: 'close-agent-selector',
                agents,
                selectedAgentId: selectedAgent?.id || '',
                onSelectAgent: (agent: AIAgent) => {
                    setSelectedAgent(agent);
                },
            },
        });
    }, [theme, intl, agents, selectedAgent, isTablet]);

    const options: Array<{action: AIRewriteAction; message: typeof messages.shorten; icon: string}> = [
        {action: 'shorten', message: messages.shorten, icon: 'text-short'},
        {action: 'elaborate', message: messages.elaborate, icon: 'text-long'},
        {action: 'improve_writing', message: messages.improveWriting, icon: 'auto-fix'},
        {action: 'fix_spelling', message: messages.fixSpelling, icon: 'spellcheck'},
        {action: 'simplify', message: messages.simplify, icon: 'creation-outline'},
        {action: 'summarize', message: messages.summarize, icon: 'ai-summarize'},
    ];

    const snapPoints = useMemo(() => {
        const paddingBottom = 10;
        const bottomSheetAdjust = Platform.select({ios: 5, default: 20});

        // Add agent selector height if multiple agents available
        const agentSelectorHeight = agents.length > 1 ? ITEM_HEIGHT : 0;

        // Use the same height for both generation and editing modes
        const optionsHeight = OPTIONS_PADDING + bottomSheetSnapPoint(6, ITEM_HEIGHT);
        const COMPONENT_HEIGHT = agentSelectorHeight + CUSTOM_PROMPT_INPUT_HEIGHT + optionsHeight + paddingBottom + bottomSheetAdjust;

        return [1, COMPONENT_HEIGHT];
    }, [agents.length]);

    const renderContent = () => (
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
                        />
                        <TextInput
                            ref={textInputRef}
                            style={styles.customPromptInput}
                            placeholder={intl.formatMessage(isGeneratingContent ? messages.generatePrompt : messages.customPrompt)}
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

            {!isGeneratingContent && (
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
    );

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={Screens.AI_REWRITE_OPTIONS}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            scrollable={true}
            keyboardBehavior='extend'
            keyboardBlurBehavior='none'
            testID='ai_rewrite_options'
        />
    );
};

export default RewriteOptions;

