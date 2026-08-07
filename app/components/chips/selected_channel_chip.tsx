// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import BaseChip from './base_chip';

type Props = {
    id: string;
    text: string;
    onRemove: (id: string) => void;
    testID?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        iconContainer: {
            width: 20,
            height: 20,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
    };
});

export default function SelectedChannelChip({
    id,
    text,
    onRemove,
    testID,
}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const action = useMemo(() => ({icon: 'remove' as const, onPress: () => onRemove(id)}), [id, onRemove]);

    const prefix = useMemo(() => (
        <View style={styles.iconContainer}>
            <CompassIcon
                name='globe'
                size={12}
                color={changeOpacity(theme.centerChannelColor, 0.72)}
            />
        </View>
    ), [styles.iconContainer, theme.centerChannelColor]);

    return (
        <BaseChip
            testID={testID}
            action={action}
            showAnimation={true}
            label={text}
            prefix={prefix}
        />
    );
}
