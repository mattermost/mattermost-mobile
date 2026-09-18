// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages} from 'react-intl';
import {Pressable, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import Footer from '../footer';
import Label from '../label';

import RadioEntry from './radio_entry';

import type {AvailableScreens} from '@typings/screens/navigation';

const messages = defineMessages({
    clearSelection: {
        id: 'interactive_dialog.radio.clear_selection',
        defaultMessage: 'Clear selection',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        items: {
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        clearButton: {
            paddingHorizontal: 15,
            paddingVertical: 8,
        },
        clearButtonPressed: {
            opacity: 0.72,
        },
        clearButtonText: {
            color: theme.buttonBg,
            ...typography('Body', 100, 'Regular'),
        },
    };
});

type Props = {
    label: string;
    options?: DialogOption[];
    onChange: (value: string) => void;
    helpText?: string;
    errorText?: string;
    optional?: boolean;
    value?: string;
    testID: string;
    location: AvailableScreens;
    labelPosition?: 'before' | 'after';
}
function RadioSetting({
    label,
    options,
    onChange,
    helpText = '',
    errorText = '',
    optional = false,
    testID,
    value,
    location,
    labelPosition,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const handleClear = useCallback(() => onChange(''), [onChange]);
    const onClear = usePreventDoubleTap(handleClear);

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
                    testID={`${testID}.radio.${entryValue}.button`}
                    labelPosition={labelPosition}
                />,
            );
        }
        return elements;
    }, [value, onChange, options, testID, labelPosition]);

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
            {optional && value ? (
                <Pressable
                    onPress={onClear}
                    style={({pressed}) => [style.clearButton, pressed && style.clearButtonPressed]}
                    testID={`${testID}.clear`}
                >
                    <FormattedText
                        id={messages.clearSelection.id}
                        defaultMessage={messages.clearSelection.defaultMessage}
                        style={style.clearButtonText}
                    />
                </Pressable>
            ) : null}
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
