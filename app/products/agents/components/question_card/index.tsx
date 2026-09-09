// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, TextInput, View} from 'react-native';

import {TOUCH_TARGET_SIZE} from '@agents/constants';
import {ToolCallStatus, type ToolCall} from '@agents/types';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const messages = defineMessages({
    somethingElse: {
        id: 'agents.question.something_else',
        defaultMessage: 'Something else…',
    },
});

function toggleLabel(list: string[], label: string): string[] {
    if (list.includes(label)) {
        return list.filter((l) => l !== label);
    }
    return [...list, label];
}

export interface QuestionOption {
    label: string;
    description?: string;
}

export interface QuestionArgs {
    question: string;
    options: QuestionOption[];
    multiSelect: boolean;
    allowFreeForm: boolean;
}

/**
 * Extract a renderable question from AskUserQuestion tool call arguments.
 * Returns null when the arguments are missing or malformed (e.g. redacted for
 * non-requesters) so the caller can fall back to the generic tool card.
 * Mirrors mmtools.AskUserQuestionArgs.
 */
export function parseQuestionArgs(args: ToolCall['arguments']): QuestionArgs | null {
    if (args == null || typeof args !== 'object' || Array.isArray(args)) {
        return null;
    }
    const obj = args as {[key: string]: unknown};
    const question = obj.question;
    const options = obj.options;
    if (typeof question !== 'string' || question === '' || !Array.isArray(options) || options.length === 0) {
        return null;
    }
    const parsedOptions: QuestionOption[] = [];
    for (const opt of options) {
        if (opt == null || typeof opt !== 'object' || Array.isArray(opt)) {
            return null;
        }
        const optObj = opt as {[key: string]: unknown};
        if (typeof optObj.label !== 'string' || optObj.label === '') {
            return null;
        }
        parsedOptions.push({
            label: optObj.label,
            description: typeof optObj.description === 'string' ? optObj.description : undefined,
        });
    }
    return {
        question,
        options: parsedOptions,
        multiSelect: obj.multi_select === true,

        // Mirror the server pointer semantics (mmtools.AskUserQuestionArgs):
        // an absent key means enabled, an explicit false disables.
        allowFreeForm: obj.allow_free_form !== false,
    };
}

/**
 * Extract the selected option labels and any free-form text from the tool
 * result content ({"selected": [...], "custom": "..."}, see
 * mmtools.AskUserQuestionResult). Non-JSON results yield an empty answer.
 */
export function parseAnswerFromResult(result?: string): {selected: string[]; custom: string} {
    if (!result) {
        return {selected: [], custom: ''};
    }
    try {
        const parsed = JSON.parse(result);
        const selected = Array.isArray(parsed?.selected) ? parsed.selected.filter((s: unknown) => typeof s === 'string') : [];
        const custom = typeof parsed?.custom === 'string' ? parsed.custom : '';
        return {selected, custom};
    } catch {
        return {selected: [], custom: ''};
    }
}

interface QuestionCardProps {
    tool: ToolCall;
    question: QuestionArgs;
    isProcessing: boolean;
    localDecision?: boolean | null;
    canAnswer: boolean;
    onAnswer?: (toolId: string, selections: string[], custom: string) => void;
    onSkip?: (toolId: string) => void;
}

interface OptionRowProps {
    label: string;
    description?: string;
    index: number;
    selected: boolean;
    multiSelect: boolean;
    interactive: boolean;
    testID: string;
    onPress: (label: string) => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        card: {
            marginTop: 8,
            marginBottom: 12,
            paddingVertical: 12,
            paddingHorizontal: 12,
            gap: 8,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderLeftWidth: 3,
            borderLeftColor: theme.buttonBg,
            borderRadius: 4,
        },
        questionTitle: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'SemiBold'),
        },
        optionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            minHeight: TOUCH_TARGET_SIZE,
            paddingVertical: 8,
            paddingHorizontal: 8,
            borderRadius: 4,
        },
        optionRowSelected: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
        numberBadge: {
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.24),
            alignItems: 'center',
            justifyContent: 'center',
        },
        numberBadgeSelected: {
            borderColor: theme.buttonBg,
            backgroundColor: theme.buttonBg,
        },
        numberBadgeText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 75, 'SemiBold'),
        },
        numberBadgeTextSelected: {
            color: theme.buttonColor,
        },
        checkbox: {
            width: 20,
            height: 20,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.24),
            alignItems: 'center',
            justifyContent: 'center',
        },
        checkboxChecked: {
            borderColor: theme.buttonBg,
            backgroundColor: theme.buttonBg,
        },
        optionText: {
            flex: 1,
            gap: 2,
        },
        optionLabel: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        optionDescription: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        freeFormInput: {
            flex: 1,
            color: theme.centerChannelColor,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 8,
            ...typography('Body', 200),
        },
        footer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 4,
        },
        selectedCount: {
            flex: 1,
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        skipButton: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 16,
            minHeight: 32,
            justifyContent: 'center',
        },
        skipButtonText: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 75, 'SemiBold'),
        },
        submitButton: {
            backgroundColor: theme.buttonBg,
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 16,
            minHeight: 32,
            justifyContent: 'center',
        },
        submitButtonDisabled: {
            opacity: 0.4,
        },
        submitButtonText: {
            color: theme.buttonColor,
            ...typography('Body', 75, 'SemiBold'),
        },
        statusLine: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
        },
        statusText: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 100),
        },
    };
});

const OptionSelector = ({selected, index, multiSelect}: {selected: boolean; index: number; multiSelect: boolean}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    if (multiSelect) {
        return (
            <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                {selected && (
                    <CompassIcon
                        name='check'
                        size={14}
                        color={theme.buttonColor}
                    />
                )}
            </View>
        );
    }
    return (
        <View style={[styles.numberBadge, selected && styles.numberBadgeSelected]}>
            <Text style={[styles.numberBadgeText, selected && styles.numberBadgeTextSelected]}>
                {index + 1}
            </Text>
        </View>
    );
};

const OptionRow = ({label, description, index, selected, multiSelect, interactive, testID, onPress}: OptionRowProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onPress(label);
    }, [onPress, label]);

    return (
        <Pressable
            onPress={handlePress}
            style={({pressed}) => [
                styles.optionRow,
                selected && styles.optionRowSelected,
                interactive && pressed && {opacity: 0.72},
            ]}
            disabled={!interactive}
            testID={testID}
        >
            <OptionSelector
                selected={selected}
                index={index}
                multiSelect={multiSelect}
            />
            <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{label}</Text>
                {Boolean(description) && (
                    <Text style={styles.optionDescription}>{description}</Text>
                )}
            </View>
        </Pressable>
    );
};

/**
 * Inline interactive card for AskUserQuestion tool calls: option rows with a
 * radio badge (single-select) or checkbox (multi-select), an optional
 * free-form answer that expands in place, and Skip.
 *
 * Submission: single-select answers submit immediately on tap; multi-select
 * and free-form answers require the explicit Submit button, because answers
 * are terminal server-side with no edit path.
 */
const QuestionCard = ({
    tool,
    question,
    isProcessing,
    localDecision,
    canAnswer,
    onAnswer,
    onSkip,
}: QuestionCardProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const [selections, setSelections] = useState<string[]>([]);

    // Whether the free-form "Something else…" row is selected, plus the text
    // typed into it. The row follows the same select rules as other options.
    const [freeFormSelected, setFreeFormSelected] = useState(false);
    const [customText, setCustomText] = useState('');

    const isPending = tool.status === ToolCallStatus.Pending || tool.status === ToolCallStatus.Accepted;
    const isAnswered = tool.status === ToolCallStatus.Success;
    const isSkipped = tool.status === ToolCallStatus.Rejected;
    const hasLocalDecision = localDecision !== undefined && localDecision !== null;
    const interactive = isPending && canAnswer && !isProcessing && !hasLocalDecision && Boolean(onAnswer && onSkip);

    const answered = useMemo(() => parseAnswerFromResult(tool.result), [tool.result]);
    const shownSelections = isAnswered ? answered.selected : selections;
    const shownFreeFormSelected = isAnswered ? answered.custom !== '' : freeFormSelected;
    const shownCustomText = isAnswered ? answered.custom : customText;

    const trimmedCustom = customText.trim();
    const customAnswered = freeFormSelected && trimmedCustom !== '';

    const handleOptionPress = useCallback((label: string) => {
        if (!interactive) {
            return;
        }
        if (question.multiSelect) {
            setSelections((prev) => toggleLabel(prev, label));
            return;
        }

        // Single-select with no free-form entry in progress submits
        // immediately — the common tap-one-of-three path costs one tap.
        setFreeFormSelected(false);
        setSelections([label]);
        onAnswer?.(tool.id, [label], '');
    }, [interactive, question.multiSelect, onAnswer, tool.id]);

    const handleFreeFormToggle = useCallback(() => {
        if (!interactive) {
            return;
        }
        if (question.multiSelect) {
            setFreeFormSelected((prev) => !prev);
        } else {
            // Single-select: choosing free-form replaces any predefined choice
            // and switches to explicit submission (typing needs a confirm).
            setFreeFormSelected(true);
            setSelections([]);
        }
    }, [interactive, question.multiSelect]);

    // Submit requires at least one valid choice. When free-form is selected
    // its text must be non-empty; otherwise a predefined option must be
    // selected.
    const canSubmit = freeFormSelected ? (customAnswered || selections.length > 0) : selections.length > 0;
    const selectedCount = selections.length + (customAnswered ? 1 : 0);

    const handleSubmit = usePreventDoubleTap(useCallback(() => {
        if (!canSubmit) {
            return;
        }
        onAnswer?.(tool.id, selections, customAnswered ? trimmedCustom : '');
    }, [canSubmit, onAnswer, tool.id, selections, customAnswered, trimmedCustom]));

    const handleSkip = usePreventDoubleTap(useCallback(() => {
        onSkip?.(tool.id);
    }, [onSkip, tool.id]));

    const testIdPrefix = `agents.question_card.${tool.id}`;

    // The explicit Submit step exists exactly where a mis-tap would be
    // unrecoverable: multi-select batches and typed free-form answers.
    const needsExplicitSubmit = question.multiSelect || freeFormSelected;

    const renderStatus = () => {
        if (isProcessing || (hasLocalDecision && isPending)) {
            return (
                <View
                    style={styles.statusLine}
                    testID={`${testIdPrefix}.status.submitting`}
                >
                    <Loading
                        size='small'
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                    <FormattedText
                        id='agents.question.submitting'
                        defaultMessage='Submitting…'
                        style={styles.statusText}
                    />
                </View>
            );
        }
        if (isAnswered) {
            return (
                <View
                    style={styles.statusLine}
                    testID={`${testIdPrefix}.status.answered`}
                >
                    <CompassIcon
                        name='check-circle'
                        size={14}
                        color={theme.onlineIndicator}
                    />
                    <FormattedText
                        id='agents.question.answered'
                        defaultMessage='Answered'
                        style={styles.statusText}
                    />
                </View>
            );
        }
        if (isSkipped) {
            return (
                <View
                    style={styles.statusLine}
                    testID={`${testIdPrefix}.status.skipped`}
                >
                    <CompassIcon
                        name='close-circle-outline'
                        size={14}
                        color={theme.dndIndicator}
                    />
                    <FormattedText
                        id='agents.question.skipped'
                        defaultMessage='Skipped'
                        style={styles.statusText}
                    />
                </View>
            );
        }
        if (isPending && !canAnswer) {
            return (
                <View
                    style={styles.statusLine}
                    testID={`${testIdPrefix}.status.waiting`}
                >
                    <FormattedText
                        id='agents.question.waiting_for_requester'
                        defaultMessage='Waiting for an answer from the requester'
                        style={styles.statusText}
                    />
                </View>
            );
        }
        return null;
    };

    return (
        <View
            style={styles.card}
            testID={testIdPrefix}
        >
            <Text style={styles.questionTitle}>{question.question}</Text>
            {question.options.map((opt, idx) => (
                <OptionRow
                    key={opt.label}
                    label={opt.label}
                    description={opt.description}
                    index={idx}
                    selected={shownSelections.includes(opt.label)}
                    multiSelect={question.multiSelect}
                    interactive={interactive}
                    testID={`${testIdPrefix}.option.${idx}`}
                    onPress={handleOptionPress}
                />
            ))}
            {question.allowFreeForm && (interactive || shownFreeFormSelected) && (
                shownFreeFormSelected ? (
                    <View style={styles.optionRow}>
                        <Pressable
                            onPress={handleFreeFormToggle}
                            disabled={!interactive}
                            style={({pressed}) => [interactive && pressed && {opacity: 0.72}]}
                            testID={`${testIdPrefix}.free_form.toggle`}
                        >
                            <OptionSelector
                                selected={true}
                                index={question.options.length}
                                multiSelect={question.multiSelect}
                            />
                        </Pressable>
                        <TextInput
                            style={styles.freeFormInput}
                            value={shownCustomText}
                            onChangeText={setCustomText}
                            editable={interactive}
                            autoFocus={interactive}
                            multiline={false}
                            placeholder={intl.formatMessage(messages.somethingElse)}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.56)}
                            testID={`${testIdPrefix}.free_form.input`}
                        />
                    </View>
                ) : (
                    <Pressable
                        onPress={handleFreeFormToggle}
                        style={({pressed}) => [
                            styles.optionRow,
                            interactive && pressed && {opacity: 0.72},
                        ]}
                        disabled={!interactive}
                        testID={`${testIdPrefix}.free_form.option`}
                    >
                        <OptionSelector
                            selected={false}
                            index={question.options.length}
                            multiSelect={question.multiSelect}
                        />
                        <View style={styles.optionText}>
                            <FormattedText
                                id='agents.question.something_else'
                                defaultMessage='Something else…'
                                style={styles.optionLabel}
                            />
                        </View>
                    </Pressable>
                )
            )}
            {interactive && (
                <View style={styles.footer}>
                    {question.multiSelect && (
                        <FormattedText
                            id='agents.question.selected_count'
                            defaultMessage='{count, plural, =0 {None selected} other {# selected}}'
                            values={{count: selectedCount}}
                            style={styles.selectedCount}
                        />
                    )}
                    <Pressable
                        onPress={handleSkip}
                        style={({pressed}) => [styles.skipButton, pressed && {opacity: 0.72}]}
                        testID={`${testIdPrefix}.skip`}
                    >
                        <FormattedText
                            id='agents.question.skip'
                            defaultMessage='Skip'
                            style={styles.skipButtonText}
                        />
                    </Pressable>
                    {needsExplicitSubmit && (
                        <Pressable
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                            style={({pressed}) => [
                                styles.submitButton,
                                !canSubmit && styles.submitButtonDisabled,
                                pressed && {opacity: 0.72},
                            ]}
                            testID={`${testIdPrefix}.submit`}
                        >
                            <FormattedText
                                id='agents.question.submit'
                                defaultMessage='Submit'
                                style={styles.submitButtonText}
                            />
                        </Pressable>
                    )}
                </View>
            )}
            {renderStatus()}
        </View>
    );
};

export default QuestionCard;
