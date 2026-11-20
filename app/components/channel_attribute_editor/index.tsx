// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, useWindowDimensions, View} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {PROPERTY_TEXT_VALUE_MAX_LENGTH} from '@constants/channel_attributes';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import BottomSheetButton from '@screens/bottom_sheet/button';
import {TITLE_SEPARATOR_MARGIN, TITLE_SEPARATOR_MARGIN_TABLET} from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';
import {getPropertyFieldLabel, isPropertyFieldRequired, reachableOptions, type ResolvedChannelAttribute} from '@utils/channel_attributes';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import OptionRow from './option_row';
import {OPTION_ROW_HEIGHT, SAVE_BUTTON_BOTTOM_PADDING, TEXT_INPUT_MARGIN_BOTTOM, toggleSelection} from './utils';

import type {ChannelAttributeValueInput} from '@actions/remote/channel_attributes';

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
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({

    // Mirrors bottom_sheet/content.tsx, which can't be reused: its title is fixed above the
    // children. Here the title scrolls with the content so a long one can't push Save off the sheet.
    container: {
        flexGrow: 1,
    },
    titleContainer: {
        marginTop: 4,
        marginBottom: 12,
    },
    titleText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
    separator: {
        height: 1,
        right: 20,
        borderTopWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: OPTION_ROW_HEIGHT,
    },
    pressed: {
        opacity: 0.72,
    },
    clearText: {
        ...typography('Body', 200),
        color: theme.dndIndicator,
    },
    inputContainer: {
        marginBottom: TEXT_INPUT_MARGIN_BOTTOM,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 4,
    },
    saveButtonWrapper: {
        paddingBottom: SAVE_BUTTON_BOTTOM_PADDING,
    },
}));

type Props = {
    attribute: ResolvedChannelAttribute;

    clearable: boolean;

    // Channel creation: the draft value isn't persisted yet, so it must not narrow the options.
    unlockOptions?: boolean;

    onSubmit: (fieldId: string, value: ChannelAttributeValueInput) => void;
};

/**
 * Single-select commits on tap; multiselect and text need Save. Options unreachable under the
 * change policy are hidden, not disabled. A failed save is reported by the caller, not here.
 */
const ChannelAttributeEditor = ({attribute, clearable, unlockOptions = false, onSubmit}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const isTablet = useIsTablet();
    const {width: windowWidth} = useWindowDimensions();
    const separatorWidth = Math.max(windowWidth, 450);
    const separatorMarginBottom = isTablet ? TITLE_SEPARATOR_MARGIN_TABLET : TITLE_SEPARATOR_MARGIN;

    const {field, rawValue} = attribute;
    const label = getPropertyFieldLabel(field);
    const isMultiselect = field.type === 'multiselect';
    const isText = field.type === 'text';

    const options = useMemo(
        () => reachableOptions(field, unlockOptions ? undefined : rawValue),
        [field, rawValue, unlockOptions],
    );

    // Drop stored ids whose option was deleted server-side: resubmitting one rejects the whole write.
    const currentOptionIds = useMemo(() => new Set((field.attrs?.options ?? []).map((option) => option.id)), [field]);

    const initialSelection = useMemo(() => {
        if (Array.isArray(rawValue)) {
            return rawValue.filter((id): id is string => typeof id === 'string' && currentOptionIds.has(id));
        }
        return typeof rawValue === 'string' && rawValue && currentOptionIds.has(rawValue) ? [rawValue] : [];
    }, [rawValue, currentOptionIds]);

    const [selection, setSelection] = useState<string[]>(initialSelection);
    const [text, setText] = useState(typeof rawValue === 'string' ? rawValue : '');

    const submit = usePreventDoubleTap(useCallback(async (value: ChannelAttributeValueInput) => {
        // Dismiss first so the caller's error isn't hidden behind the sheet.
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

    const multiselectChanged = selection.length !== initialSelection.length || selection.some((id) => !initialSelection.includes(id));
    const textChanged = text.trim() !== (typeof rawValue === 'string' ? rawValue : '');

    // The server rejects an empty write on a required field.
    const isRequired = isPropertyFieldRequired(field);
    const textEmptied = isRequired && text.trim() === '';

    const hasSaveButton = isText || isMultiselect;

    return (
        <View
            style={styles.container}
            testID={`channel_attribute_editor.${field.name}.screen`}
        >
            <BottomSheetScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.titleContainer}>
                    <Text
                        style={styles.titleText}
                        testID={`channel_attribute_editor.${field.name}.title`}
                    >
                        {intl.formatMessage(messages.title, {attribute: label})}
                    </Text>
                </View>
                <View style={[styles.separator, {width: separatorWidth, marginBottom: separatorMarginBottom}]}/>

                {isText ? (
                    <View style={styles.inputContainer}>
                        <FloatingTextInput
                            bottomSheetInput={true}
                            label={label}
                            value={text}
                            onChangeText={setText}
                            maxLength={PROPERTY_TEXT_VALUE_MAX_LENGTH}
                            autoFocus={true}
                            theme={theme}
                            testID={`channel_attribute_editor.${field.name}.input`}
                        />
                    </View>
                ) : (
                    <>
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
                    </>
                )}
            </BottomSheetScrollView>

            {hasSaveButton && (
                <View style={styles.saveButtonWrapper}>
                    <BottomSheetButton
                        text={intl.formatMessage(messages.save)}
                        disabled={isText ? (!textChanged || textEmptied) : (!multiselectChanged || (isRequired && selection.length === 0))}
                        onPress={isText ? handleSaveText : handleSaveMultiselect}
                        testID={`channel_attribute_editor.${field.name}.save.button`}
                    />
                </View>
            )}
        </View>
    );
};

export default ChannelAttributeEditor;
