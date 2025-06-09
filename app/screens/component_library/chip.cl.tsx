// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Alert, View} from 'react-native';

import BaseChip from '@components/chips/base_chip';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';

import {useBooleanProp, useStringProp} from './hooks';
import {buildComponent} from './utils';

const propPossibilities = {};

const onPress = () => Alert.alert('Button pressed!');

const ChipComponentLibrary = () => {
    const theme = useTheme();
    const [label, labelSelector] = useStringProp('label', 'Chip text', false);
    const [showRemoveOption, showRemoveOptionSelector] = useBooleanProp('showRemoveOption', false);
    const [hasPrefix, hasPrefixSelector] = useBooleanProp('hasPrefix', false);

    const components = useMemo(
        () => buildComponent(BaseChip, propPossibilities, [], [
            label,
            showRemoveOption,
            {
                onPress,
                prefix: hasPrefix.hasPrefix ? (
                    <CompassIcon
                        name='account-outline'
                        size={16}
                        color={theme.centerChannelColor}
                        style={{marginLeft: 6}}
                    />
                ) : undefined,
                testID: 'chip-example',
                theme,
            },
        ]),
        [label, showRemoveOption, hasPrefix.hasPrefix, theme],
    );

    return (
        <>
            {labelSelector}
            {showRemoveOptionSelector}
            {hasPrefixSelector}
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16}}>{components}</View>
        </>
    );
};

export default ChipComponentLibrary;
