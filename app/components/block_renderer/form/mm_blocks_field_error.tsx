// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {useMmBlocksForm} from './context';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    error: {
        color: theme.errorTextColor,
        marginTop: 4,
        ...typography('Body', 75, 'Regular'),
    },
}));

/** Renders a field-level integration error under an input, if present. */
export function MmBlocksFieldError({name}: {name: string}) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const {errors} = useMmBlocksForm();
    const message = errors[name];
    if (!message) {
        return null;
    }
    return (
        <Text
            testID={`${name}-error`}
            style={style.error}
        >
            {message}
        </Text>
    );
}
