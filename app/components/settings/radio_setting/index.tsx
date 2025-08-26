// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import Footer from '../footer';
import Label from '../label';

import RadioEntry from './radio_entry';

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
    onChange: (value: string) => void;
    helpText?: string;
    errorText?: string;
    value?: string;
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
    location,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const optionsRender = useMemo(() => {
        if (!options) {
            return [];
        }
        const elements = [];
        for (const [i, {value: entryValue, text}] of options.entries()) {
            elements.push(
                <RadioEntry
                    handleChange={onChange}
                    isLast={i === options.length - 1}
                    isSelected={value === entryValue}
                    text={text}
                    value={entryValue}
                    key={entryValue}
                />,
            );
        }
        return elements;
    }, [value, onChange, options]);

    return (
        <View>
            <Label
                label={label}
                optional={false}
                testID={testID}
            />

            <View style={style.items}>
                {optionsRender}
            </View>
            <Footer
                disabled={false}
                errorText={errorText}
                helpText={helpText}
                location={location}
            />
        </View>
    );
}

export default RadioSetting;
