// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable} from 'react-native';

import AttributeChip from '@components/attribute_chip';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {OPTION_ROW_HEIGHT} from './utils';

const messages = defineMessages({
    selectedAccessibility: {
        id: 'channel_attributes.editor.selected_aria',
        defaultMessage: 'Selected',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,

        // minHeight, not height: a long option name wraps instead of being clipped.
        minHeight: OPTION_ROW_HEIGHT,
    },
    pressed: {
        opacity: 0.72,
    },
    checkIcon: {
        color: theme.buttonBg,
        fontSize: 24,
    },
}));

type Props = {
    fieldName: string;
    label: string;
    option: PropertyFieldOption;
    selected: boolean;
    onPress: (optionId: string) => void;
};

const OptionRow = ({fieldName, label, option, selected, onPress}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const handlePress = useCallback(() => onPress(option.id), [onPress, option.id]);

    return (
        <Pressable
            onPress={handlePress}
            style={({pressed}) => [styles.row, pressed && styles.pressed]}
            accessibilityRole='button'
            accessibilityState={{selected}}
            accessibilityLabel={selected ? `${option.name}, ${intl.formatMessage(messages.selectedAccessibility)}` : option.name}
            testID={`channel_attribute_editor.${fieldName}.option.${option.id}`}
        >
            <AttributeChip
                label={label}
                value={option.name}
                color={option.color}
                variant='option'
                announceLabel={false}
            />
            {selected && (
                <CompassIcon
                    name='check'
                    style={styles.checkIcon}
                />
            )}
        </Pressable>
    );
};

export default OptionRow;
