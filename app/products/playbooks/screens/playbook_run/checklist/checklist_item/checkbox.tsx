// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.24),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
    },
    disabled: {
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
        fontSize: 18,
    },
    disabledCheckIcon: {
        color: theme.centerChannelColor,
    },
}));

type Props = {
    checked: boolean;
    onPress: () => void;
    disabled?: boolean;
}

function Checkbox({checked, onPress, disabled}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const onPressDoubleTapPrevented = usePreventDoubleTap(onPress);

    const buttonStyle = useMemo(() => [
        styles.checkbox,
        checked && (disabled ? styles.checkedBoxDisabled : styles.checkedBox),
        disabled && styles.disabled,
    ], [styles.checkbox, styles.checkedBoxDisabled, styles.checkedBox, styles.disabled, checked, disabled]);

    const iconStyle = useMemo(() => [
        styles.checkIcon,
        disabled && styles.disabledCheckIcon,
    ], [styles.checkIcon, styles.disabledCheckIcon, disabled]);

    return (
        <TouchableOpacity
            onPress={onPressDoubleTapPrevented}
            style={buttonStyle}
            disabled={disabled}
        >
            {checked && (
                <CompassIcon
                    name='check'
                    style={iconStyle}
                    testID='check-icon'
                />
            )}
        </TouchableOpacity>
    );
}

export default Checkbox;
