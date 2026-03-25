// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-gesture-handler';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import PropertyFieldEditor from './property_field_editor';

import type PlaybookRunPropertyFieldModel from '@playbooks/database/models/playbook_run_attribute';
import type PlaybookRunPropertyValueModel from '@playbooks/database/models/playbook_run_attribute_value';

type PropertyFieldProps = {
    propertyField: PlaybookRunPropertyFieldModel;
    value?: PlaybookRunPropertyValueModel;
    onValueChange: (fieldId: string, newValue: string) => void;
    isDisabled?: boolean;
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

const PropertyField = ({
    propertyField,
    value,
    onValueChange,
    isDisabled = false,
    testID,
}: PropertyFieldProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const style = getStyleSheet(theme);

    const subContainer = [style.viewContainer, {paddingHorizontal: isTablet ? 42 : 20}];
    const currentValue = value?.value || '';

    const handlePress = useCallback(() => {
        if (isDisabled) {
            return;
        }

        const handleSave = (newValue: string) => {
            onValueChange(propertyField.id, newValue);
            dismissBottomSheet();
        };

        const renderContent = () => (
            <PropertyFieldEditor
                initialValue={currentValue}
                label={propertyField.name}
                onSave={handleSave}
                theme={theme}
                testID={testID}
            />
        );

        bottomSheet({
            title: propertyField.name,
            renderContent,
            snapPoints: ['50%', '50%'],
            theme,
            closeButtonId: 'close-property-field',
        });
    }, [isDisabled, currentValue, onValueChange, propertyField.id, propertyField.name, testID, theme]);

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
                <View style={style.labelContainer}>
                    <Text style={style.label}>{`${propertyField.name}: `}</Text>
                    <Text style={style.value}>{currentValue || intl.formatMessage({id: 'playbooks.property_field.tap_to_edit', defaultMessage: 'Tap to edit'})}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default memo(PropertyField);

