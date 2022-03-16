// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            color: theme.centerChannelBg,
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

type UndoProps = {
    onPress: () => void;
};
const Undo = ({onPress}: UndoProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    return (
        <TouchableOpacity onPress={onPress}>
            <Text
                style={styles.text}
            >
                {intl.formatMessage({
                    id: 'snack.bar.undo',
                    defaultMessage: 'Undo',
                })}
            </Text>
        </TouchableOpacity>
    );
};

export default Undo;
