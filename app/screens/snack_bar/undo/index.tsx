// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {IntlShape} from 'react-intl';
import {Text} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';

import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            color: theme.centerChannelBg,
            ...typography(),
        },
    };
});

type UndoProps = {
    onPress: () => void;
    theme: Theme;
    intl: IntlShape;
};
const Index = ({onPress, theme, intl}: UndoProps) => {
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

export default Index;
