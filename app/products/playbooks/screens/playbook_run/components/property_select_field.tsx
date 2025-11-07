// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-gesture-handler';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {formatPropertyFieldOptionsForSelector, getPropertyValueDisplay} from '@playbooks/utils/property_fields';
import {goToScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
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
        viewContainer: {
            marginVertical: 8,
            alignItems: 'center',
            width: '100%',
            flexDirection: 'row',
        },
        labelContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        label: {
            fontSize: 14,
            ...typography('Body', 200, 'SemiBold'),
            color: theme.centerChannelColor,
        },
        value: {
            fontSize: 14,
            color: theme.centerChannelColor,
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
            return intl.formatMessage({id: 'playbooks.property_field.tap_to_select', defaultMessage: 'Tap to select'});
        }
        return text;
    }, [propertyField, value, intl]);

    const handleSelect = useCallback((newSelection?: SelectedDialogOption) => {
        if (!newSelection) {
            onValueChange(propertyField.id, '');
            return;
        }

        if (Array.isArray(newSelection)) {
            // Multiselect: send array of IDs as comma-separated string
            // The client will convert to array before sending to server
            const selectedIds = newSelection.map((option) => option.value);
            const commaSeparated = selectedIds.join(',');
            onValueChange(propertyField.id, commaSeparated);
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

    const subContainer = [styles.viewContainer, {paddingHorizontal: isTablet ? 42 : 20}];

    // Always render as text that opens selector when tapped
    return (
        <View
            testID={testID}
            style={subContainer}
        >
            <TouchableOpacity
                onPress={handlePress}
                disabled={isDisabled}
                activeOpacity={0.8}
            >
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>{`${propertyField.name}: `}</Text>
                    <Text style={styles.value}>{displayText}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default memo(PropertySelectField);

