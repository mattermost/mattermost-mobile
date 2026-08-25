// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, ScrollView, Text, View, type StyleProp, type ViewStyle} from 'react-native';

import Button from '@components/button';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {updateChecklistItem} from '@playbooks/actions/remote/checklist';
import {navigateBack} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

// Matches server MaxTaskRequirementValueLength / desktop fill modal.
export const MAX_REQUIREMENT_VALUE_LENGTH = 1024;

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
    },
    content: {
        paddingVertical: 24,
        paddingHorizontal: 20,
        gap: 16,
    },
    description: {
        ...typography('Body', 200, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    field: {
        gap: 4,
    },
    footer: {
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 8,
    },
}));

export type FillRequirementsProps = {
    playbookRunId: string;
    itemId: string;
    checklistNumber: number;
    itemNumber: number;
    taskTitle: string;
    requirements: TaskRequirement[];
    currentState: ChecklistItemState;
    editMode?: boolean;
};

type RequirementFieldProps = {
    requirement: TaskRequirement;
    value: string;
    error?: string;
    editable: boolean;
    theme: Theme;
    style: StyleProp<ViewStyle>;
    onChange: (id: string, next: string) => void;
};

const RequirementField = ({
    requirement,
    value,
    error,
    editable,
    theme,
    style,
    onChange,
}: RequirementFieldProps) => {
    const onChangeText = useCallback((next: string) => {
        onChange(requirement.id, next.slice(0, MAX_REQUIREMENT_VALUE_LENGTH));
    }, [onChange, requirement.id]);

    return (
        <View style={style}>
            <FloatingTextInput
                label={requirement.label}
                onChangeText={onChangeText}
                testID={`requirement-value-${requirement.id}`}
                value={value}
                theme={theme}
                error={error}
                editable={editable}
                maxLength={MAX_REQUIREMENT_VALUE_LENGTH}
            />
        </View>
    );
};

const close = () => {
    Keyboard.dismiss();
    navigateBack();
};

const FillRequirements = ({
    playbookRunId,
    itemId,
    checklistNumber,
    itemNumber,
    taskTitle,
    requirements = [],
    currentState,
    editMode,
}: FillRequirementsProps) => {
    const navigation = useNavigation();
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const savingRef = useRef(false);

    const isTaskComplete = currentState === 'closed';
    const [values, setValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        for (const req of requirements) {
            initial[req.id] = req.value || '';
        }
        return initial;
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        navigation.setOptions({
            gestureEnabled: !saving,
        });
    }, [navigation, saving]);

    useAndroidHardwareBackHandler(Screens.PLAYBOOK_FILL_REQUIREMENTS, close);

    const getTrimmedValues = useCallback(() => {
        const trimmed: Record<string, string> = {};
        for (const req of requirements) {
            trimmed[req.id] = (values[req.id] || '').trim();
        }
        return trimmed;
    }, [requirements, values]);

    const validateAllFilled = useCallback((trimmed: Record<string, string>) => {
        const nextErrors: Record<string, string> = {};
        const message = formatMessage({
            id: 'playbooks.checklist_item.requirements.field_required',
            defaultMessage: 'This field is required to mark the task complete',
        });
        for (const req of requirements) {
            if (!trimmed[req.id]) {
                nextErrors[req.id] = message;
            }
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }, [formatMessage, requirements]);

    const handleRequirementChange = useCallback((id: string, next: string) => {
        setValues((prev) => ({...prev, [id]: next}));
        setErrors((prev) => {
            if (!prev[id] || !next.trim()) {
                return prev;
            }
            const rest = {...prev};
            delete rest[id];
            return rest;
        });
    }, []);

    const save = useCallback(async (state: ChecklistItemState, requirementValues: Record<string, string>) => {
        if (savingRef.current) {
            return;
        }
        savingRef.current = true;
        setSaving(true);
        try {
            const res = await updateChecklistItem(
                serverUrl,
                playbookRunId,
                itemId,
                checklistNumber,
                itemNumber,
                state,
                requirementValues,
            );
            if (res.error) {
                showPlaybookErrorSnackbar();
                logDebug('FillRequirements save error', getFullErrorMessage(res.error));
                return;
            }
            close();
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }, [checklistNumber, itemId, itemNumber, playbookRunId, serverUrl]);

    const handleSave = useCallback(async () => {
        setErrors({});
        await save(currentState || '', getTrimmedValues());
    }, [currentState, getTrimmedValues, save]);

    const handleSaveAndComplete = useCallback(async () => {
        const trimmed = getTrimmedValues();
        if (!validateAllFilled(trimmed)) {
            return;
        }
        await save('closed', trimmed);
    }, [getTrimmedValues, save, validateAllFilled]);

    const description = editMode || isTaskComplete ?
        formatMessage(
            {
                id: 'playbooks.checklist_item.requirements.edit_description',
                defaultMessage: 'Update the required fields for “{taskTitle}”. Save anytime, or fill every field to mark the task complete.',
            },
            {taskTitle},
        ) :
        formatMessage(
            {
                id: 'playbooks.checklist_item.requirements.fill_description',
                defaultMessage: 'Fill in the required fields for “{taskTitle}”. You can save a draft, or mark the task complete when all fields are filled.',
            },
            {taskTitle},
        );

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps='handled'
            >
                <Text style={styles.description}>{description}</Text>
                {requirements.map((req) => (
                    <RequirementField
                        key={req.id}
                        requirement={req}
                        value={values[req.id] || ''}
                        error={errors[req.id]}
                        editable={!saving}
                        theme={theme}
                        style={styles.field}
                        onChange={handleRequirementChange}
                    />
                ))}
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    theme={theme}
                    text={formatMessage({id: 'playbooks.checklist_item.requirements.save', defaultMessage: 'Save'})}
                    onPress={handleSave}
                    emphasis='tertiary'
                    disabled={saving}
                    showLoader={saving}
                    testID='modal-save-requirements'
                />
                {!isTaskComplete && (
                    <Button
                        theme={theme}
                        text={formatMessage({
                            id: 'playbooks.checklist_item.requirements.save_and_complete',
                            defaultMessage: 'Save and mark complete',
                        })}
                        onPress={handleSaveAndComplete}
                        disabled={saving}
                        showLoader={saving}
                        testID='modal-save-and-complete'
                    />
                )}
            </View>
        </View>
    );
};

export default FillRequirements;
