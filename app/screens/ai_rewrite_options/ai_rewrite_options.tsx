// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import NetworkManager from '@managers/network_manager';
import BottomSheet from '@screens/bottom_sheet';
import {dismissBottomSheet, openAsBottomSheet} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {logWarning} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AnimatedAIIcon from './animated_ai_icon';

import type {AIAgent, AIRewriteAction} from '@typings/api/ai';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    closeButtonId: string;
    componentId: AvailableScreens;
    originalMessage: string;
    updateValue: (value: string | ((prevValue: string) => string)) => void;
}

const CUSTOM_PROMPT_INPUT_HEIGHT = 56;
const OPTIONS_PADDING = 12;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
    },
    customPromptContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    customPromptContainerGeneration: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    customPromptInput: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 15,
        color: theme.centerChannelColor,
        minHeight: 40,
    },
    optionsContainer: {
        paddingTop: OPTIONS_PADDING,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: changeOpacity(theme.centerChannelBg, 0.95),
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingContent: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginTop: 24,
        fontSize: 16,
        color: theme.centerChannelColor,
        fontWeight: '600',
    },
    errorIcon: {
        marginBottom: 12,
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.centerChannelColor,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    closeButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: theme.buttonBg,
        borderRadius: 4,
    },
    closeButtonText: {
        color: theme.buttonColor,
        fontSize: 16,
        fontWeight: '600',
    },
}));

const AIRewriteOptions = ({
    closeButtonId,
    componentId,
    originalMessage,
    updateValue,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [customPrompt, setCustomPrompt] = useState('');
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const currentPromiseRef = useRef<Promise<string> | null>(null);
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
            } else {
                setErrorMessage(intl.formatMessage({
                    id: 'ai_rewrite.no_agents_available',
                    defaultMessage: 'AI features are not available on this server.',
                }));
            }
        };

        // Subscribe to agent updates
        const subscription = EphemeralStore.observeAIAgents(serverUrl).subscribe(handleAgentsUpdate);

        return () => subscription.unsubscribe();
    }, [serverUrl, intl]);

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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cancel any ongoing promises
            currentPromiseRef.current = null;
            setIsProcessing(false);
            setErrorMessage('');
        };
    }, []);

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

    const handleRewrite = useCallback(async (action: AIRewriteAction, prompt?: string) => {
        if (isProcessing) {
            return;
        }

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

        setIsProcessing(true);
        setErrorMessage('');

        // Create timeout promise (30 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('timeout')), 30000);
        });

        try {
            const client = NetworkManager.getClient(serverUrl);

            // For generation, pass empty string as message and use prompt; for editing, use original message
            const messageToProcess = isGenerating ? '' : originalMessage;
            const agentId = selectedAgent?.id;
            const rewritePromise = client.getAIRewrittenMessage(messageToProcess, action, prompt, agentId);
            currentPromiseRef.current = rewritePromise;

            // Race between API call and timeout
            const response = await Promise.race([rewritePromise, timeoutPromise]);

            // Check if this is still the current promise (not cancelled)
            if (currentPromiseRef.current === rewritePromise) {
                // Ensure response is a valid non-empty string before updating
                if (response && typeof response === 'string' && response.trim().length > 0) {
                    // If response is a JSON-encoded string, parse it to get actual newlines/escapes
                    let formattedResponse = response;
                    if (response.startsWith('"') && response.endsWith('"')) {
                        try {
                            formattedResponse = JSON.parse(response);
                        } catch (e) {
                            // If parsing fails, use the response as-is
                            logWarning('Failed to parse JSON-encoded response, using raw:', e);
                        }
                    }
                    updateValue(formattedResponse);
                } else {
                    logWarning('Invalid or empty AI response received:', response);

                    // Show error if response is invalid
                    setErrorMessage(intl.formatMessage({
                        id: 'ai_rewrite.error.invalid_response',
                        defaultMessage: 'Received an invalid response from AI. Please try again.',
                    }));
                    setIsProcessing(false);
                    currentPromiseRef.current = null;
                    return; // Don't close, show error instead
                }

                setIsProcessing(false);
                currentPromiseRef.current = null;

                // Close bottom sheet after updating value
                try {
                    await closeBottomSheet();
                } catch (e) {
                    logWarning('Error closing bottom sheet after success:', e);
                }
            }
        } catch (error) {
            // Only handle error if this is still the current promise
            if (currentPromiseRef.current) {
                logWarning('AI rewrite error:', error);

                // Determine error message
                let errorMsg = intl.formatMessage({
                    id: 'ai_rewrite.error.generic',
                    defaultMessage: 'An error occurred while rewriting your message. Please try again.',
                });

                if (error instanceof Error && error.message === 'timeout') {
                    errorMsg = intl.formatMessage({
                        id: 'ai_rewrite.error.timeout',
                        defaultMessage: 'The AI request timed out. Please try again.',
                    });
                }

                // Show error in overlay instead of closing
                setErrorMessage(errorMsg);
                setIsProcessing(false);
                currentPromiseRef.current = null;
            }
        }
    }, [isProcessing, originalMessage, serverUrl, updateValue, closeBottomSheet, intl, selectedAgent, isKeyboardVisible]);

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

    const handleDismissError = useCallback(async () => {
        setErrorMessage('');
        try {
            await closeBottomSheet();
        } catch (e) {
            logWarning('Error dismissing bottom sheet:', e);

            // Force dismiss using the navigation directly
            dismissBottomSheet(Screens.AI_REWRITE_OPTIONS).catch(() => {
                // Last resort - if dismissal fails, at least clear the error state
                logWarning('Failed to dismiss bottom sheet');
            });
        }
    }, [closeBottomSheet]);

    const isTablet = useIsTablet();

    const handleOpenAgentSelector = useCallback(() => {
        const title = isTablet ? intl.formatMessage({
            id: 'ai_rewrite.agent_selector_title',
            defaultMessage: 'Select AI Agent',
        }) : '';

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

    const options: Array<{action: AIRewriteAction; labelId: string; defaultLabel: string; icon: string}> = [
        {action: 'shorten', labelId: 'ai_rewrite.shorten', defaultLabel: 'Shorten', icon: 'arrow-collapse'},
        {action: 'elaborate', labelId: 'ai_rewrite.elaborate', defaultLabel: 'Elaborate', icon: 'arrow-expand'},
        {action: 'improve_writing', labelId: 'ai_rewrite.improve_writing', defaultLabel: 'Improve writing', icon: 'pencil-outline'},
        {action: 'fix_spelling', labelId: 'ai_rewrite.fix_spelling', defaultLabel: 'Fix spelling and grammar', icon: 'format-letter-case'},
        {action: 'simplify', labelId: 'ai_rewrite.simplify', defaultLabel: 'Simplify', icon: 'lightbulb-outline'},
        {action: 'summarize', labelId: 'ai_rewrite.summarize', defaultLabel: 'Summarize', icon: 'message-text-outline'},
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
            {(isProcessing || errorMessage) && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContent}>
                        {isProcessing && !errorMessage && (
                            <>
                                <AnimatedAIIcon
                                    size={48}
                                    color={theme.buttonBg}
                                />
                                <Text style={styles.loadingText}>
                                    {intl.formatMessage({
                                        id: isGeneratingContent ? 'ai_rewrite.generating' : 'ai_rewrite.processing',
                                        defaultMessage: isGeneratingContent ? 'AI is generating...' : 'AI is rewriting...',
                                    })}
                                </Text>
                            </>
                        )}
                        {errorMessage && (
                            <>
                                <CompassIcon
                                    name='alert-circle-outline'
                                    size={48}
                                    color={theme.errorTextColor}
                                    style={styles.errorIcon}
                                />
                                <Text style={styles.errorText}>
                                    {errorMessage}
                                </Text>
                                <TouchableOpacity
                                    onPress={handleDismissError}
                                    style={styles.closeButton}
                                >
                                    <Text style={styles.closeButtonText}>
                                        {intl.formatMessage({
                                            id: 'ai_rewrite.error.close',
                                            defaultMessage: 'Close',
                                        })}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            )}

            {agents.length > 1 && (
                <OptionItem
                    label={intl.formatMessage({
                        id: 'ai_rewrite.select_agent',
                        defaultMessage: 'Select agent',
                    })}
                    info={selectedAgent?.displayName || intl.formatMessage({
                        id: 'ai_rewrite.no_agent_selected',
                        defaultMessage: 'None',
                    })}
                    action={handleOpenAgentSelector}
                    type='arrow'
                    testID='ai_rewrite.select_agent'
                />
            )}

            <View style={isGeneratingContent ? styles.customPromptContainerGeneration : styles.customPromptContainer}>
                <TextInput
                    ref={textInputRef}
                    style={styles.customPromptInput}
                    placeholder={intl.formatMessage({
                        id: isGeneratingContent ? 'ai_rewrite.generate_prompt' : 'ai_rewrite.custom_prompt',
                        defaultMessage: isGeneratingContent ? 'Ask agents to create a message' : 'Ask AI to edit message...',
                    })}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    value={customPrompt}
                    onChangeText={setCustomPrompt}
                    onSubmitEditing={handleCustomPromptSubmit}
                    returnKeyType='send'
                    multiline={false}
                    editable={!isProcessing}
                    autoCapitalize='none'
                />
            </View>

            {!isGeneratingContent && (
                <View style={styles.optionsContainer}>
                    {options.map((option) => (
                        <OptionItem
                            key={option.action}
                            label={intl.formatMessage({id: option.labelId, defaultMessage: option.defaultLabel})}
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

export default AIRewriteOptions;
