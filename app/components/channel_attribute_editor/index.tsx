// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, View} from 'react-native';

import AttributeChip from '@components/attribute_chip';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {PROPERTY_TEXT_VALUE_MAX_LENGTH} from '@constants/channel_attributes';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';
import {getPropertyFieldLabel, isPropertyFieldRequired, reachableOptions, type ResolvedChannelAttribute} from '@utils/channel_attributes';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {ChannelAttributeValueInput} from '@actions/remote/channel_attributes';

export const OPTION_ROW_HEIGHT = 48;

const messages = defineMessages({
    title: {
        id: 'channel_attributes.editor.title',
        defaultMessage: 'Set {attribute}',
    },
    clear: {
        id: 'channel_attributes.editor.clear',
        defaultMessage: 'Clear value',
    },
    save: {
        id: 'channel_attributes.editor.save',
        defaultMessage: 'Save',
    },
    selectedAccessibility: {
        id: 'channel_attributes.editor.selected_aria',
        defaultMessage: 'Selected',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,

        // minHeight, not height: the option chip renders its full name without
        // truncation, so a long one can wrap to more than one line and a fixed
        // height would clip it.
        minHeight: OPTION_ROW_HEIGHT,
    },
    pressed: {
        opacity: 0.72,
    },
    checkIcon: {
        color: theme.buttonBg,
        fontSize: 24,
    },
    clearText: {
        ...typography('Body', 200),
        color: theme.dndIndicator,
    },
    inputContainer: {
        marginBottom: 12,
    },
}));

// Extracted so the toggle is a pure function rather than a third callback nested
// inside the state updater inside the handler.
function toggleSelection(ids: string[], optionId: string): string[] {
    return ids.includes(optionId) ? ids.filter((id) => id !== optionId) : [...ids, optionId];
}

type OptionRowProps = {
    fieldName: string;
    label: string;
    option: PropertyFieldOption;
    selected: boolean;
    onPress: (optionId: string) => void;
};

/**
 * One option in the picker.
 *
 * The id comes back through the callback rather than being closed over inline, so
 * the parent can pass a single memoized handler to every row.
 */
const OptionRow = ({fieldName, label, option, selected, onPress}: OptionRowProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const handlePress = useCallback(() => onPress(option.id), [onPress, option.id]);

    return (
        <Pressable
            onPress={handlePress}
            style={({pressed}) => [styles.row, pressed && styles.pressed]}
            accessibilityRole='button'
            accessibilityState={{selected}}
            accessibilityLabel={selected ? `${option.name}, ${intl.formatMessage(messages.selectedAccessibility)}` : option.name}
            testID={`channel_attribute_editor.${fieldName}.option.${option.id}`}
        >
            <AttributeChip
                label={label}
                value={option.name}
                color={option.color}
                variant='option'
                announceLabel={false}
            />
            {selected && (
                <CompassIcon
                    name='check'
                    style={styles.checkIcon}
                />
            )}
        </Pressable>
    );
};

type Props = {
    attribute: ResolvedChannelAttribute;

    // Whether a value may be removed. Only true when the field's change policy is
    // `any` or nothing is set yet: the server refuses a clear under a directional
    // policy, because clearing then re-setting would launder a value straight past
    // it.
    clearable: boolean;

    // True only for the channel-creation form: nothing has been written yet, so a
    // locally chosen draft value must not narrow the option list the way an
    // already-persisted value would. The draft is still what pre-selects the
    // sheet when it is reopened — only the option-list narrowing is bypassed.
    unlockOptions?: boolean;

    onSubmit: (fieldId: string, value: ChannelAttributeValueInput) => void;
};

/**
 * The Set {attribute} sheet.
 *
 * A single-select field commits on choice — a save step on a one-field sheet is
 * friction, and it is what every other picker in the app does. A multiselect and
 * a text field cannot, so both get an explicit Save; for text that also means an
 * abandoned edit closes the sheet rather than clearing the value.
 *
 * The option list is narrowed by the field's change policy rather than rendered
 * with the unreachable options disabled: under a directional policy those are not
 * choices, and showing them greyed out only invites the tap.
 *
 * This component owns no error surface. A failed save is reported by the row that
 * asked for it, which is still on screen after the sheet closes.
 */
const ChannelAttributeEditor = ({attribute, clearable, unlockOptions = false, onSubmit}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const {field, rawValue} = attribute;
    const label = getPropertyFieldLabel(field);
    const isMultiselect = field.type === 'multiselect';
    const isText = field.type === 'text';

    const options = useMemo(
        () => reachableOptions(field, unlockOptions ? undefined : rawValue),
        [field, rawValue, unlockOptions],
    );

    // Intersected against the field's current option ids so a stored id whose
    // option has since been deleted server-side never gets silently resubmitted:
    // it is invisible in the picker, and submitting it back would have the
    // server reject the whole write.
    const currentOptionIds = useMemo(() => new Set((field.attrs?.options ?? []).map((option) => option.id)), [field]);

    const initialSelection = useMemo(() => {
        if (Array.isArray(rawValue)) {
            return rawValue.filter((id): id is string => typeof id === 'string' && currentOptionIds.has(id));
        }
        return typeof rawValue === 'string' && rawValue && currentOptionIds.has(rawValue) ? [rawValue] : [];
    }, [rawValue, currentOptionIds]);

    const [selection, setSelection] = useState<string[]>(initialSelection);
    const [text, setText] = useState(typeof rawValue === 'string' ? rawValue : '');

    // Guarded once here rather than at each call site, so every commit path — an
    // option tap, Clear, Save — is covered by one double-tap window while toggling
    // a multiselect stays unguarded: picking three options quickly is the point
    // there, not a mis-tap.
    const submit = usePreventDoubleTap(useCallback(async (value: ChannelAttributeValueInput) => {
        // Dismiss first: the parent owns the error surface, and it has to be on
        // screen rather than behind the sheet if the write is refused.
        await dismissBottomSheet();
        onSubmit(field.id, value);
    }, [field.id, onSubmit]));

    const handleSelect = useCallback((optionId: string) => {
        if (isMultiselect) {
            setSelection((current) => toggleSelection(current, optionId));
            return;
        }
        submit(optionId);
    }, [isMultiselect, submit]);

    const handleClear = useCallback(() => submit(null), [submit]);

    const handleSaveMultiselect = useCallback(() => submit(selection), [selection, submit]);

    const handleSaveText = useCallback(() => submit(text.trim()), [submit, text]);

    // Nothing to compare a multiselect against but the value it started with, and
    // order is not meaningful, so a set comparison is what decides whether Save
    // does anything.
    const multiselectChanged = selection.length !== initialSelection.length || selection.some((id) => !initialSelection.includes(id));
    const textChanged = text.trim() !== (typeof rawValue === 'string' ? rawValue : '');

    // A required field never accepts an empty write — the server always rejects
    // it — so trimming down to nothing must not be offered as a savable change.
    const isRequired = isPropertyFieldRequired(field);
    const textEmptied = isRequired && text.trim() === '';

    if (isText) {
        return (
            <BottomSheetContent
                showButton={true}
                showTitle={true}
                titleSeparator={true}
                title={intl.formatMessage(messages.title, {attribute: label})}
                buttonText={intl.formatMessage(messages.save)}
                disableButton={!textChanged || textEmptied}
                onPress={handleSaveText}
                testID={`channel_attribute_editor.${field.name}`}
            >
                <View style={styles.inputContainer}>
                    <FloatingTextInput
                        label={label}
                        value={text}
                        onChangeText={setText}
                        maxLength={PROPERTY_TEXT_VALUE_MAX_LENGTH}
                        autoFocus={true}
                        theme={theme}
                        testID={`channel_attribute_editor.${field.name}.input`}
                    />
                </View>
            </BottomSheetContent>
        );
    }

    return (
        <BottomSheetContent
            showButton={isMultiselect}
            showTitle={true}
            titleSeparator={true}
            title={intl.formatMessage(messages.title, {attribute: label})}
            buttonText={isMultiselect ? intl.formatMessage(messages.save) : undefined}
            disableButton={!multiselectChanged || (isRequired && selection.length === 0)}
            onPress={handleSaveMultiselect}
            testID={`channel_attribute_editor.${field.name}`}
        >
            {options.map((option) => (
                <OptionRow
                    key={option.id}
                    fieldName={field.name}
                    label={label}
                    option={option}
                    selected={selection.includes(option.id)}
                    onPress={handleSelect}
                />
            ))}

            {clearable && (
                <Pressable
                    onPress={handleClear}
                    style={({pressed}) => [styles.row, pressed && styles.pressed]}
                    accessibilityRole='button'
                    testID={`channel_attribute_editor.${field.name}.clear`}
                >
                    <FormattedText
                        {...messages.clear}
                        style={styles.clearText}
                    />
                </Pressable>
            )}
        </BottomSheetContent>
    );
};

export default ChannelAttributeEditor;
