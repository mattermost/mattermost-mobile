// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, TextInput, View} from 'react-native';

import {TOUCH_TARGET_SIZE} from '@agents/constants';
import {ToolCallStatus, type ToolCall} from '@agents/types';
import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {parseAnswerFromResult, type QuestionArgs} from './utils';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        card: {
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderLeftWidth: 3,
            borderLeftColor: theme.buttonBg,
            borderRadius: 4,
            padding: 12,
            gap: 12,
        },
        questionTitle: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        optionList: {
            gap: 4,
        },
        optionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            minHeight: TOUCH_TARGET_SIZE,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 4,
        },
        optionRowSelected: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
        optionTextContainer: {
            flex: 1,
        },
        optionLabel: {
            color: theme.centerChannelColor,
            ...typography('Body', 100),
        },
        optionDescription: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        freeFormInput: {
            flex: 1,
            color: theme.centerChannelColor,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.24),
            borderRadius: 4,
            paddingVertical: 6,
            paddingHorizontal: 10,
            ...typography('Body', 100),
        },
        footer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        selectedCount: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 75),
        },
        footerButtons: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginLeft: 'auto',
        },
        skipButton: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 16,
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 32,
        },
        skipButtonText: {
            color: theme.buttonBg,
            ...typography('Body', 75, 'SemiBold'),
        },
        submitButton: {
            backgroundColor: theme.buttonBg,
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 16,
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 32,
        },
        submitButtonText: {
            color: theme.buttonColor,
            ...typography('Body', 75, 'SemiBold'),
        },
        buttonDisabled: {
            opacity: 0.5,
        },
        statusLine: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        statusText: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 75),
        },
    };
});

const messages = defineMessages({
    somethingElse: {
        id: 'agents.question.something_else',
        defaultMessage: 'Something else…',
    },
});

function toggleLabel(labels: string[], label: string): string[] {
    return labels.includes(label) ? labels.filter((l) => l !== label) : [...labels, label];
}

interface OptionRowProps {
    label: string;
    description?: string;
    index: number;
    multiSelect: boolean;
    selected: boolean;
    interactive: boolean;
    onToggle: (label: string) => void;
    testIdPrefix: string;
}

const OptionRow = ({label, description, index, multiSelect, selected, interactive, onToggle, testIdPrefix}: OptionRowProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onToggle(label);
    }, [onToggle, label]);

    let iconName: CompassIconName = multiSelect ? 'checkbox-blank-outline' : 'radiobox-blank';
    if (selected) {
        iconName = multiSelect ? 'checkbox-marked' : 'radiobox-marked';
    }

    return (
        <Pressable
            onPress={handlePress}
            disabled={!interactive}
            style={({pressed}) => [styles.optionRow, selected && styles.optionRowSelected, interactive && pressed && {opacity: 0.72}]}
            testID={`${testIdPrefix}.option.${index}`}
        >
            <CompassIcon
                name={iconName}
                size={20}
                color={selected ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.56)}
            />
            <View style={styles.optionTextContainer}>
                <Text style={styles.optionLabel}>{label}</Text>
                {Boolean(description) && (
                    <Text style={styles.optionDescription}>{description}</Text>
                )}
            </View>
        </Pressable>
    );
};

interface QuestionCardProps {
    tool: ToolCall;
    question: QuestionArgs;
    isProcessing: boolean;
    localDecision?: boolean | null; // true = answered, false = skipped, null/undefined = undecided
    canAnswer: boolean;
    onAnswer?: (toolId: string, selections: string[], custom: string) => void;
    onSkip?: (toolId: string) => void;
}

/**
 * Inline card for an AskUserQuestion tool call: the user answers by picking
 * from the offered options (and/or typing a free-form answer) instead of
 * approving a tool execution. Mirrors the webapp QuestionCard semantics.
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
    // typed into it. The row behaves like any other option for select rules.
    const [freeFormSelected, setFreeFormSelected] = useState(false);
    const [customText, setCustomText] = useState('');

    const isPending = tool.status === ToolCallStatus.Pending || tool.status === ToolCallStatus.Accepted;
    const isAnswered = tool.status === ToolCallStatus.Success;
    const isSkipped = tool.status === ToolCallStatus.Rejected;
    const hasLocalDecision = localDecision !== undefined && localDecision !== null;
    const interactive = isPending && canAnswer && !isProcessing && !hasLocalDecision && Boolean(onAnswer && onSkip);

    // A decided question renders the recorded answer, not local state.
    const answered = useMemo(() => parseAnswerFromResult(tool.result), [tool.result]);
    const shownSelections = isAnswered ? answered.selected : selections;
    const shownFreeFormSelected = isAnswered ? answered.custom !== '' : freeFormSelected;
    const shownCustomText = isAnswered ? answered.custom : customText;

    const trimmedCustom = customText.trim();
    const customAnswered = freeFormSelected && trimmedCustom !== '';

    // Submit requires at least one valid choice. When free-form is selected
    // its text must be non-empty; otherwise a predefined option must be
    // selected.
    const canSubmit = customAnswered || selections.length > 0;
    const selectedCount = selections.length + (customAnswered ? 1 : 0);

    // Single-select with no free-form text entered submits immediately on
    // option tap; multi-select and any free-form engagement require an
    // explicit Submit so a stray tap cannot discard a typed answer.
    const showSubmit = question.multiSelect || freeFormSelected || trimmedCustom !== '';

    const submitAnswer = usePreventDoubleTap(useCallback((selectedLabels: string[], custom: string) => {
        onAnswer?.(tool.id, selectedLabels, custom);
    }, [onAnswer, tool.id]));

    const handleToggleOption = useCallback((label: string) => {
        if (!interactive) {
            return;
        }
        if (question.multiSelect) {
            setSelections((prev) => toggleLabel(prev, label));
            return;
        }

        // Single-select: a predefined choice replaces any other choice,
        // including the free-form row.
        setSelections([label]);
        setFreeFormSelected(false);
        if (trimmedCustom === '') {
            submitAnswer([label], '');
        }
    }, [interactive, question.multiSelect, trimmedCustom, submitAnswer]);

    const handleToggleFreeForm = useCallback(() => {
        if (!interactive) {
            return;
        }
        if (question.multiSelect) {
            setFreeFormSelected((prev) => !prev);
        } else {
            // Single-select: choosing free-form replaces any predefined choice.
            setFreeFormSelected(true);
            setSelections([]);
        }
    }, [interactive, question.multiSelect]);

    const handleSubmit = usePreventDoubleTap(useCallback(() => {
        onAnswer?.(tool.id, selections, customAnswered ? trimmedCustom : '');
    }, [onAnswer, tool.id, selections, customAnswered, trimmedCustom]));

    const handleSkip = usePreventDoubleTap(useCallback(() => {
        onSkip?.(tool.id);
    }, [onSkip, tool.id]));

    const testIdPrefix = `agents.question_card.${tool.id}`;

    let freeFormMarkerIcon: CompassIconName = question.multiSelect ? 'checkbox-blank-outline' : 'radiobox-blank';
    if (shownFreeFormSelected) {
        freeFormMarkerIcon = question.multiSelect ? 'checkbox-marked' : 'radiobox-marked';
    }

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
            <View style={styles.optionList}>
                {question.options.map((opt, idx) => (
                    <OptionRow
                        key={opt.label}
                        label={opt.label}
                        description={opt.description}
                        index={idx}
                        multiSelect={question.multiSelect}
                        selected={shownSelections.includes(opt.label)}
                        interactive={interactive}
                        onToggle={handleToggleOption}
                        testIdPrefix={testIdPrefix}
                    />
                ))}
                {question.allowFreeForm && (interactive || shownFreeFormSelected) && (
                    shownFreeFormSelected ? (

                        // Selected: the "Something else…" label becomes the
                        // placeholder of an inline single-line input that
                        // expands in place.
                        <View
                            style={[styles.optionRow, styles.optionRowSelected]}
                            testID={`${testIdPrefix}.free_form`}
                        >
                            <Pressable
                                onPress={handleToggleFreeForm}
                                disabled={!interactive}
                                style={({pressed}) => [interactive && pressed && {opacity: 0.72}]}
                                testID={`${testIdPrefix}.free_form.marker`}
                            >
                                <CompassIcon
                                    name={freeFormMarkerIcon}
                                    size={20}
                                    color={theme.buttonBg}
                                />
                            </Pressable>
                            <TextInput
                                style={styles.freeFormInput}
                                value={shownCustomText}
                                onChangeText={setCustomText}
                                editable={interactive}
                                placeholder={intl.formatMessage(messages.somethingElse)}
                                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.42)}
                                testID={`${testIdPrefix}.free_form.input`}
                            />
                        </View>
                    ) : (
                        <Pressable
                            onPress={handleToggleFreeForm}
                            disabled={!interactive}
                            style={({pressed}) => [styles.optionRow, interactive && pressed && {opacity: 0.72}]}
                            testID={`${testIdPrefix}.free_form`}
                        >
                            <CompassIcon
                                name={freeFormMarkerIcon}
                                size={20}
                                color={changeOpacity(theme.centerChannelColor, 0.56)}
                            />
                            <View style={styles.optionTextContainer}>
                                <FormattedText
                                    id='agents.question.something_else'
                                    defaultMessage='Something else…'
                                    style={styles.optionLabel}
                                />
                            </View>
                        </Pressable>
                    )
                )}
            </View>
            {interactive && (
                <View style={styles.footer}>
                    {question.multiSelect && (
                        <FormattedText
                            id='agents.question.selected_count'
                            defaultMessage='{count, plural, =0 {None selected} one {# selected} other {# selected}}'
                            values={{count: selectedCount}}
                            style={styles.selectedCount}
                        />
                    )}
                    <View style={styles.footerButtons}>
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
                        {showSubmit && (
                            <Pressable
                                onPress={handleSubmit}
                                disabled={!canSubmit}
                                style={({pressed}) => [styles.submitButton, !canSubmit && styles.buttonDisabled, pressed && {opacity: 0.72}]}
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
                </View>
            )}
            {renderStatus()}
        </View>
    );
};

export default QuestionCard;
