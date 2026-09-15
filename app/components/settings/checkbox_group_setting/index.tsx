// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import Footer from '../footer';
import Label from '../label';

import CheckboxEntry from './checkbox_entry';

import type {AvailableScreens} from '@typings/screens/navigation';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        items: {
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});

type Props = {
    label: string;
    options?: DialogOption[];
    onChange: (value: string[]) => void;
    helpText?: string;
    errorText?: string;
    value?: string[];
    testID: string;
    location: AvailableScreens;
    labelPosition?: 'before' | 'after';
    disabled?: boolean;
    optional?: boolean;
}

function CheckboxGroupSetting({
    label,
    options,
    onChange,
    helpText = '',
    errorText = '',
    testID,
    value,
    location,
    labelPosition,
    disabled = false,
    optional = false,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const handleChange = useCallback((entryValue: string, checked: boolean) => {
        const current = value || [];
        const next = checked ? [...current, entryValue] : current.filter((v) => v !== entryValue);
        onChange(next);
    }, [onChange, value]);

    const optionsRender = useMemo(() => {
        if (!options) {
            return [];
        }
        const selected = value || [];
        const elements = [];
        for (const [i, {value: entryValue, text}] of options.entries()) {
            elements.push(
                <CheckboxEntry
                    handleChange={handleChange}
                    isLast={i === options.length - 1}
                    isSelected={selected.includes(entryValue)}
                    text={text}
                    value={entryValue}
                    key={entryValue}
                    testID={`${testID}.checkbox.${entryValue}.button`}
                    labelPosition={labelPosition}
                    disabled={disabled}
                />,
            );
        }
        return elements;
    }, [value, handleChange, options, testID, labelPosition, disabled]);

    return (
        <View>
            <Label
                label={label}
                optional={optional}
                testID={testID}
            />

            <View style={style.items}>
                {optionsRender}
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

export default CheckboxGroupSetting;
