// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import Footer from '../footer';
import Label from '../label';

import RadioEntry, {type RadioEntryVariant} from './radio_entry';

import type {AvailableScreens} from '@typings/screens/navigation';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        items: {
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
    };
});

type Props = {
    label: string;
    options?: DialogOption[];
    onChange: (value: string | string[]) => void;
    helpText?: string;
    errorText?: string;
    value?: string | string[];
    multiselect?: boolean;
    optional?: boolean;
    disabled?: boolean;
    testID: string;
    location: AvailableScreens;
}

function RadioSetting({
    label,
    options,
    onChange,
    helpText = '',
    errorText = '',
    testID,
    value,
    multiselect = false,
    optional = false,
    disabled = false,
    location,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const variant: RadioEntryVariant = multiselect ? 'checklist' : 'radio';

    const selectedValues = useMemo(() => {
        if (Array.isArray(value)) {
            return new Set(value);
        }
        if (value) {
            return new Set([value]);
        }
        return new Set<string>();
    }, [value]);

    const handleChange = useCallback((entryValue: string) => {
        if (!multiselect) {
            onChange(entryValue);
            return;
        }

        const next = new Set(selectedValues);
        if (next.has(entryValue)) {
            next.delete(entryValue);
        } else {
            next.add(entryValue);
        }
        onChange([...next]);
    }, [multiselect, onChange, selectedValues]);

    const optionsRender = useMemo(() => {
        if (!options) {
            return [];
        }
        return options.map(({value: entryValue, text}, i) => (
            <RadioEntry
                key={entryValue}
                handleChange={handleChange}
                isLast={i === options.length - 1}
                isSelected={selectedValues.has(entryValue)}
                text={text}
                value={entryValue}
                variant={variant}
                disabled={disabled}
                testID={`${testID}.${variant === 'checklist' ? 'check' : 'radio'}.${entryValue}.button`}
            />
        ));
    }, [disabled, handleChange, options, selectedValues, testID, variant]);

    return (
        <View>
            {Boolean(label?.trim()) && (
                <Label
                    label={label}
                    optional={optional}
                    testID={testID}
                />
            )}

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

export default RadioSetting;
