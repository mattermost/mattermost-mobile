// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
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
    checkedBox: {
        backgroundColor: theme.buttonBg,
        borderColor: theme.buttonBg,
    },
    checkIcon: {
        color: theme.buttonColor,
        fontSize: 18,
    },
}));

type Props = {
    checked: boolean;
    onPress: () => void;
}

function Checkbox({checked, onPress}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const buttonStyle = useMemo(() => [
        styles.checkbox,
        checked && styles.checkedBox,
    ], [styles.checkbox, checked, styles.checkedBox]);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={buttonStyle}
        >
            {checked && (
                <CompassIcon
                    name='check'
                    style={styles.checkIcon}
                />
            )}
        </TouchableOpacity>
    );
}

export default Checkbox;
