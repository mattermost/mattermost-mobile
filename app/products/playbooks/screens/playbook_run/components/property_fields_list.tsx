// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {ActivityIndicator, Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {fetchPlaybookRunPropertyFields, updatePlaybookRunPropertyValue} from '@playbooks/actions/remote/property_fields';
import {observePlaybookRunPropertyFieldsWithValues} from '@playbooks/database/queries/property_fields';
import {sortPropertyFieldsByOrder} from '@playbooks/utils/property_fields';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import {PropertyField, PropertySelectField} from './index';

import type PlaybookRunPropertyFieldModel from '@playbooks/database/models/playbook_run_attribute';
import type PlaybookRunPropertyValueModel from '@playbooks/database/models/playbook_run_attribute_value';
import type {WithDatabaseArgs} from '@typings/database/database';

const messages = defineMessages({
    propertyFields: {
        id: 'playbooks.playbook_run.property_fields',
        defaultMessage: 'Property Fields',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        gap: 12,
        marginTop: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    header: {
        ...typography('Heading', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    loadingContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: 16,
    },
    emptyText: {
        ...typography('Body', 100, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
}));

type PropertyFieldsListProps = WithDatabaseArgs & {
    serverUrl: string;
    runId: string;
    isReadOnly: boolean;
};

const PropertyFieldsListComponent = ({
    serverUrl,
    runId,
    isReadOnly,
    propertyFieldsWithValues = [],
}: PropertyFieldsListProps & {propertyFieldsWithValues?: Array<{propertyField: PlaybookRunPropertyFieldModel; value?: PlaybookRunPropertyValueModel}>}) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const [updatingFieldId, setUpdatingFieldId] = useState<string | null>(null);

    // Fetch property fields when component mounts to ensure they're loaded
    useEffect(() => {
        fetchPlaybookRunPropertyFields(serverUrl, runId, false).catch(() => {
            // Silently fail - property fields are not critical
        });
    }, [serverUrl, runId]);

    // Sort property fields by sort_order
    const sortedPropertyFields = useMemo(() => {
        if (!propertyFieldsWithValues || propertyFieldsWithValues.length === 0) {
            return [];
        }
        const fields = propertyFieldsWithValues.map((item) => item.propertyField);
        return sortPropertyFieldsByOrder(fields);
    }, [propertyFieldsWithValues]);

    // Create a map of values by field ID for quick lookup
    const valuesMap = useMemo(() => {
        const map = new Map<string, PlaybookRunPropertyValueModel>();
        if (propertyFieldsWithValues) {
            propertyFieldsWithValues.forEach((item) => {
                if (item.value) {
                    map.set(item.propertyField.id, item.value);
                }
            });
        }
        return map;
    }, [propertyFieldsWithValues]);

    const handleValueChange = useCallback(async (fieldId: string, newValue: string) => {
        if (isReadOnly) {
            return;
        }

        setUpdatingFieldId(fieldId);
        const result = await updatePlaybookRunPropertyValue(serverUrl, runId, fieldId, newValue);
        setUpdatingFieldId(null);

        if (result.error) {
            showPlaybookErrorSnackbar();
        }
    }, [isReadOnly, serverUrl, runId]);

    // Render property fields
    const renderPropertyFields = () => {
        if (sortedPropertyFields.length === 0) {
            return (
                <></>
            );
        }

        return sortedPropertyFields.map((propertyField) => {
            const value = valuesMap.get(propertyField.id);
            const isUpdating = updatingFieldId === propertyField.id;
            const isDisabled = isReadOnly || isUpdating;
            const testID = `playbook_run.property_field.${propertyField.id}`;

            if (propertyField.type === 'text') {
                return (
                    <PropertyField
                        key={propertyField.id}
                        propertyField={propertyField}
                        value={value}
                        onValueChange={handleValueChange}
                        isDisabled={isDisabled}
                        testID={testID}
                    />
                );
            }

            if (propertyField.type === 'select' || propertyField.type === 'multiselect') {
                // Include value's updateAt in key to force re-render when value changes
                const selectKey = `${propertyField.id}-${value?.updateAt ?? 'no-value'}`;
                return (
                    <View key={selectKey}>
                        <PropertySelectField
                            key={selectKey}
                            propertyField={propertyField}
                            value={value}
                            onValueChange={handleValueChange}
                            isDisabled={isDisabled}
                            isMultiselect={propertyField.type === 'multiselect'}
                            testID={testID}
                        />
                        {isUpdating && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator
                                    size='small'
                                    color={theme.buttonBg}
                                />
                            </View>
                        )}
                    </View>
                );
            }

            return null;
        });
    };

    return (
        <View
            style={styles.container}
            testID='playbook_run.property_fields_list'
        >
            <View style={styles.headerContainer}>
                <Text style={styles.header}>
                    {intl.formatMessage(messages.propertyFields)}
                </Text>
            </View>
            {renderPropertyFields()}
        </View>
    );
};

const enhanced = withObservables(['runId'], ({database, runId}: PropertyFieldsListProps) => {
    return {
        propertyFieldsWithValues: observePlaybookRunPropertyFieldsWithValues(database, runId),
    };
});

export default withDatabase(enhanced(PropertyFieldsListComponent));

