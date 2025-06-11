// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import AutocompleteSelector from '@components/autocomplete_selector';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {logError} from '@utils/log';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {getSelectedOptionIds} from '@utils/user';

import type {SelectFieldProps} from '@typings/screens/edit_profile';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginVertical: 8,
            paddingHorizontal: 20,
            width: '100%',
            backgroundColor: theme.centerChannelBg,
        },
        tabletContainer: {
            paddingHorizontal: 42,
        },
    };
});

const SelectField = ({
    fieldKey,
    label,
    value,
    options,
    isDisabled = false,
    onValueChange,
    onFocusNextField,
    testID,
    isOptional = false,
    isMultiselect = false,
}: SelectFieldProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    let formattedLabel = label;
    if (isOptional) {
        formattedLabel = intl.formatMessage(
            {
                id: 'select_field.optional',
                defaultMessage: '{labelName} (optional)',
            },
            {labelName: label},
        );
    }

    // Convert stored value to selected format for AutocompleteSelector
    const selectedValue = useMemo(() => {
        if (!value) {
            return isMultiselect ? [] : undefined;
        }

        const selectedIds = getSelectedOptionIds(value, isMultiselect ? 'multiselect' : 'select');

        if (isMultiselect) {
            return selectedIds;
        }

        return selectedIds[0] || undefined;
    }, [value, isMultiselect]);

    const handleSelect = useCallback((newSelection?: SelectedDialogOption) => {
        if (!newSelection) {
            onValueChange(fieldKey, '');
            return;
        }

        if (Array.isArray(newSelection)) {
            // Multiselect: convert array of selections to JSON string of IDs
            const selectedIds = newSelection.map((option) => option.value);
            let stringifiedIds;
            try {
                stringifiedIds = JSON.stringify(selectedIds);
            } catch (e) {
                logError('Error serializing selected IDs', e);
                stringifiedIds = '';
            }
            onValueChange(fieldKey, stringifiedIds);
        } else {
            // Single select: store the option ID
            onValueChange(fieldKey, newSelection.value);
        }

        // Focus next field after selection
        onFocusNextField(fieldKey);
    }, [fieldKey, onValueChange, onFocusNextField]);

    const containerStyle = useMemo(() => [
        styles.container,
        isTablet && styles.tabletContainer,
    ], [isTablet, styles]);

    const placeholder = useMemo(() => {
        if (isMultiselect) {
            return intl.formatMessage({
                id: 'mobile.action_menu.select_multiple',
                defaultMessage: 'Select one or more options',
            });
        }
        return intl.formatMessage({
            id: 'mobile.action_menu.select',
            defaultMessage: 'Select an option',
        });
    }, [intl, isMultiselect]);

    return (
        <View
            style={containerStyle}
            testID={testID}
        >
            <AutocompleteSelector
                label={formattedLabel}
                options={options}
                selected={selectedValue}
                onSelected={handleSelect}
                disabled={isDisabled}
                isMultiselect={isMultiselect}
                testID={`${testID}.selector`}
                location={Screens.EDIT_PROFILE}
                placeholder={placeholder}
            />
        </View>
    );
};

export default SelectField;
