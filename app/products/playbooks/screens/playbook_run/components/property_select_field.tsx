// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity, View} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {formatPropertyFieldOptionsForSelector, getPropertyValueDisplay} from '@playbooks/utils/property_fields';
import {goToScreen} from '@screens/navigation';
import {logError} from '@utils/log';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {getSelectedOptionIds} from '@utils/user';

import type PlaybookRunPropertyFieldModel from '@playbooks/database/models/playbook_run_attribute';
import type PlaybookRunPropertyValueModel from '@playbooks/database/models/playbook_run_attribute_value';

type PropertySelectFieldProps = {
    propertyField: PlaybookRunPropertyFieldModel;
    value?: PlaybookRunPropertyValueModel;
    onValueChange: (fieldId: string, newValue: string) => void;
    isDisabled?: boolean;
    isMultiselect: boolean;
    testID: string;
};

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

const PropertySelectField = ({
    propertyField,
    value,
    onValueChange,
    isDisabled = false,
    isMultiselect = false,
    testID,
}: PropertySelectFieldProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    // Convert stored value to selected format for selector screen
    const selectedValue = useMemo(() => {
        if (!value?.value) {
            return isMultiselect ? [] : undefined;
        }

        const selectedIds = getSelectedOptionIds(value.value, isMultiselect ? 'multiselect' : 'select');

        if (isMultiselect) {
            return selectedIds;
        }

        return selectedIds[0] || undefined;
    }, [value?.value, isMultiselect]);

    // Get options from property field attrs
    const options = useMemo(() => {
        return formatPropertyFieldOptionsForSelector(propertyField);
    }, [propertyField]);

    // Get display text
    const displayText = useMemo(() => {
        const text = getPropertyValueDisplay(propertyField, value);
        if (!text) {
            return isMultiselect ?
                intl.formatMessage({id: 'mobile.action_menu.select_multiple', defaultMessage: 'Select one or more options'}) :
                intl.formatMessage({id: 'mobile.action_menu.select', defaultMessage: 'Select an option'});
        }
        return text;
    }, [propertyField, value, intl, isMultiselect]);

    const handleSelect = useCallback((newSelection?: SelectedDialogOption) => {
        if (!newSelection) {
            onValueChange(propertyField.id, '');
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
            onValueChange(propertyField.id, stringifiedIds);
        } else {
            // Single select: store the option ID
            onValueChange(propertyField.id, newSelection.value);
        }
    }, [propertyField.id, onValueChange]);

    // Open selector screen when tapped
    const handlePress = useCallback(() => {
        if (isDisabled) {
            return;
        }

        goToScreen(Screens.INTEGRATION_SELECTOR, propertyField.name, {
            dataSource: '',
            options,
            handleSelect,
            selected: selectedValue,
            isMultiselect,
        });
    }, [isDisabled, propertyField.name, options, handleSelect, selectedValue, isMultiselect]);

    const containerStyle = useMemo(() => [
        styles.container,
        isTablet && styles.tabletContainer,
    ], [isTablet, styles]);

    // Always render as text that opens selector when tapped
    return (
        <View style={containerStyle}>
            <TouchableOpacity
                onPress={handlePress}
                disabled={isDisabled}
                testID={testID}
                activeOpacity={0.8}
            >
                <FloatingTextInput
                    rawInput={true}
                    disableFullscreenUI={true}
                    editable={false}
                    keyboardType='default'
                    label={propertyField.name}
                    testID={`${testID}.input`}
                    theme={theme}
                    value={displayText}
                />
            </TouchableOpacity>
        </View>
    );
};

export default memo(PropertySelectField);

