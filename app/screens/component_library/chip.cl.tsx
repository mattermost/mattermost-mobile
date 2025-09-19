// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Alert, View} from 'react-native';

import BaseChip from '@components/chips/base_chip';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';

import {useBooleanProp, useDropdownProp, useStringProp} from './hooks';
import {buildComponent} from './utils';

const propPossibilities = {};

const onPress = () => Alert.alert('Button pressed!');
const onActionPress = () => Alert.alert('Action pressed!');

const ChipComponentLibrary = () => {
    const theme = useTheme();
    const [label, labelSelector] = useStringProp('label', 'Chip text', false);
    const [actionIcon, actionIconPossibilities, actionIconSelector] = useDropdownProp('actionIcon', 'remove', ['remove', 'downArrow'], true);
    const [hasPrefix, hasPrefixSelector] = useBooleanProp('hasPrefix', false);

    const actionPossibilities = useMemo(() => {
        if (!actionIconPossibilities) {
            return undefined;
        }
        return {
            action: actionIconPossibilities.actionIcon.map((iconName) => ({
                icon: iconName,
                onPress: onActionPress,
            })),
        };
    }, [actionIconPossibilities]);

    const components = useMemo(
        () => buildComponent(BaseChip, propPossibilities, [
            actionPossibilities,
        ], [
            label,
            actionIcon,
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
        [actionPossibilities, label, actionIcon, hasPrefix.hasPrefix, theme],
    );

    return (
        <>
            {labelSelector}
            {actionIconSelector}
            {hasPrefixSelector}
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16}}>{components}</View>
        </>
    );
};

export default ChipComponentLibrary;
