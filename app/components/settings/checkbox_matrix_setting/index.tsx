// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {encodeMatrixValue, parseMatrixValue} from '@utils/dialog_utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Footer from '../footer';
import Label from '../label';

import type {AvailableScreens} from '@typings/screens/navigation';

// Fixed row/header heights are what keeps the frozen label column and the
// horizontally-scrolling grid aligned row-for-row without any scroll-sync
// logic: only the horizontal axis scrolls, so as long as every row is the
// same height on both sides they stay vertically in sync automatically.
const MATRIX_ROW_HEIGHT = 44;
const MATRIX_HEADER_HEIGHT = 40;
const LABEL_COLUMN_WIDTH = 120;
const COLUMN_WIDTH = 70;
const CONTROL_SIZE = 20;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row',
        },
        labelColumn: {
            width: LABEL_COLUMN_WIDTH,
        },
        headerSpacer: {
            height: MATRIX_HEADER_HEIGHT,
        },
        rowLabelCell: {
            height: MATRIX_ROW_HEIGHT,
            justifyContent: 'center',
            paddingHorizontal: 15,
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        rowLabelText: {
            fontSize: 12,
            color: theme.centerChannelColor,
        },
        headerRow: {
            flexDirection: 'row',
            height: MATRIX_HEADER_HEIGHT,
        },
        headerCell: {
            width: COLUMN_WIDTH,
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 6,
            paddingHorizontal: 4,
        },
        headerCellText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.64),
            textAlign: 'center',
        },
        gridRow: {
            flexDirection: 'row',
            height: MATRIX_ROW_HEIGHT,
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        cell: {
            width: COLUMN_WIDTH,
            justifyContent: 'center',
            alignItems: 'center',
        },
        pressed: {
            opacity: 0.72,
        },
        checkbox: {
            width: CONTROL_SIZE,
            height: CONTROL_SIZE,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.24),
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        checkboxDisabled: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
        },
        checkedBox: {
            backgroundColor: theme.buttonBg,
            borderColor: theme.buttonBg,
        },
        checkedBoxDisabled: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
        },
        checkIcon: {
            color: theme.buttonColor,
            fontSize: 14,
        },
        disabledCheckIcon: {
            color: theme.centerChannelColor,
        },
        radioRing: {
            width: CONTROL_SIZE,
            height: CONTROL_SIZE,
            borderRadius: CONTROL_SIZE / 2,
            borderWidth: 2,
            borderColor: changeOpacity(theme.centerChannelColor, 0.56),
            justifyContent: 'center',
            alignItems: 'center',
        },
        radioRingSelected: {
            borderColor: theme.buttonBg,
        },
        radioRingDisabled: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
        },
        radioDot: {
            width: CONTROL_SIZE / 2,
            height: CONTROL_SIZE / 2,
            borderRadius: CONTROL_SIZE / 4,
            backgroundColor: theme.buttonBg,
        },
        radioDotDisabled: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.12),
        },
    };
});

type MatrixStyle = ReturnType<typeof getStyleSheet>;

type MatrixCellProps = {
    rowValue: string;
    columnValue: string;
    checked: boolean;
    isRadio: boolean;
    disabled: boolean;
    onToggle: (rowValue: string, columnValue: string) => void;
    style: MatrixStyle;
    testID: string;
}

function MatrixCell({rowValue, columnValue, checked, isRadio, disabled, onToggle, style, testID}: MatrixCellProps) {
    const onPress = useCallback(() => {
        onToggle(rowValue, columnValue);
    }, [onToggle, rowValue, columnValue]);

    const control = isRadio ? (
        <View style={[style.radioRing, checked && style.radioRingSelected, disabled && style.radioRingDisabled]}>
            {checked && (
                <View style={[style.radioDot, disabled && style.radioDotDisabled]}/>
            )}
        </View>
    ) : (
        <View style={[style.checkbox, checked && (disabled ? style.checkedBoxDisabled : style.checkedBox), disabled && style.checkboxDisabled]}>
            {checked && (
                <CompassIcon
                    name='check'
                    style={[style.checkIcon, disabled && style.disabledCheckIcon]}
                    testID={`${testID}.checked`}
                />
            )}
        </View>
    );

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({pressed}) => [style.cell, pressed && style.pressed]}
            testID={testID}
        >
            {control}
        </Pressable>
    );
}

type Props = {
    id: string;
    label: string;
    helpText?: string;
    errorText?: string;
    matrixConfig: {rows: AppSelectOption[]; columns: AppSelectOption[]; row_selection?: 'multiple' | 'single'};
    onChange: (value: string[]) => void;
    value?: string[];
    testID: string;
    location: AvailableScreens;
    disabled?: boolean;
    optional?: boolean;
}

function CheckboxMatrixSetting({
    id,
    label,
    helpText = '',
    errorText = '',
    matrixConfig,
    onChange,
    value,
    testID,
    location,
    disabled = false,
    optional = false,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const {rows, columns, row_selection: rowSelection} = matrixConfig;
    const isRadio = rowSelection === 'single';

    const selection = useMemo(() => parseMatrixValue(value || []), [value]);

    const updateSelection = useCallback((next: Map<string, Set<string>>) => {
        onChange(encodeMatrixValue(next));
    }, [onChange]);

    const handleCellToggle = useCallback((rowValue: string, columnValue: string) => {
        if (isRadio) {
            const next = new Map(selection);
            next.set(rowValue, new Set([columnValue]));
            updateSelection(next);
            return;
        }

        const nextRow = new Set(selection.get(rowValue));
        if (nextRow.has(columnValue)) {
            nextRow.delete(columnValue);
        } else {
            nextRow.add(columnValue);
        }

        const next = new Map(selection);
        if (nextRow.size === 0) {
            next.delete(rowValue);
        } else {
            next.set(rowValue, nextRow);
        }
        updateSelection(next);
    }, [isRadio, selection, updateSelection]);

    return (
        <View>
            <Label
                label={label}
                optional={optional}
                testID={testID}
            />
            <View style={style.container}>
                <View style={style.labelColumn}>
                    <View style={style.headerSpacer}/>
                    {rows.map((row, i) => (
                        <View
                            key={`${id}.row.${i}`}
                            style={style.rowLabelCell}
                        >
                            <Text
                                style={style.rowLabelText}
                                numberOfLines={2}
                            >
                                {row.label || row.value || ''}
                            </Text>
                        </View>
                    ))}
                </View>
                <ScrollView
                    horizontal={true}
                    showsHorizontalScrollIndicator={true}
                    testID={`${testID}.matrix.${id}.scroll`}
                >
                    <View>
                        <View style={style.headerRow}>
                            {columns.map((column, i) => (
                                <View
                                    key={`${id}.column.${i}`}
                                    style={style.headerCell}
                                >
                                    <Text
                                        style={style.headerCellText}
                                        numberOfLines={2}
                                    >
                                        {column.label || column.value || ''}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        {rows.map((row, rowIndex) => {
                            const rowValue = row.value || '';
                            const selectedColumns = selection.get(rowValue);
                            return (
                                <View
                                    key={`${id}.gridRow.${rowIndex}`}
                                    style={style.gridRow}
                                >
                                    {columns.map((column, columnIndex) => {
                                        const columnValue = column.value || '';
                                        return (
                                            <MatrixCell
                                                key={`${id}.cell.${rowIndex}.${columnIndex}`}
                                                rowValue={rowValue}
                                                columnValue={columnValue}
                                                checked={Boolean(selectedColumns?.has(columnValue))}
                                                isRadio={isRadio}
                                                disabled={disabled}
                                                onToggle={handleCellToggle}
                                                style={style}
                                                testID={`${testID}.matrix.${rowValue}.${columnValue}.button`}
                                            />
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
            <Footer
                disabled={disabled}
                errorText={errorText}
                helpText={helpText}
                location={location}
            />
        </View>
    );
}

export default CheckboxMatrixSetting;
