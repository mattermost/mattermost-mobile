// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Alert, View} from 'react-native';

import OptionItem from '@components/option_item';

import {useBooleanProp, useDropdownProp, useNumberProp, useStringProp} from './hooks';
import {buildComponent} from './utils';

const propPossibilities = {};

const optionTypeValues = ['none', 'toggle', 'arrow', 'default', 'radio', 'remove', 'select', 'link'];

const onAction = (value: string | boolean) => Alert.alert('Action triggered!', `Value: ${value}`);
const onRemove = () => Alert.alert('Remove triggered!');

const OptionItemComponentLibrary = () => {
    const [label, labelSelector] = useStringProp('label', 'Option Item Label', false);
    const [description, descriptionSelector] = useStringProp('description', 'This is a description for the option item', false);
    const [icon, iconSelector] = useStringProp('icon', '', false);
    const [iconColor, iconColorSelector] = useStringProp('iconColor', '', false);
    const [info, infoSelector] = useStringProp('info', 'Info text', false);
    const [type, typePosibilities, typeSelector] = useDropdownProp('type', 'default', optionTypeValues, true);
    const [selected, selectedSelector] = useBooleanProp('selected', false);
    const [destructive, destructiveSelector] = useBooleanProp('destructive', false);
    const [inline, inlineSelector] = useBooleanProp('inline', false);
    const [descriptionNumberOfLines, descriptionLinesSelector] = useNumberProp('descriptionNumberOfLines', 1);
    const [longInfo, longInfoSelector] = useBooleanProp('longInfo', false);
    const [nonDestructiveDescription, nonDestructiveDescriptionSelector] = useBooleanProp('nonDestructiveDescription', false);
    const [isRadioCheckmark, isRadioCheckmarkSelector] = useBooleanProp('isRadioCheckmark', false);

    const components = useMemo(
        () => buildComponent(OptionItem, propPossibilities, [
            typePosibilities,
        ], [
            label,
            description,
            icon,
            iconColor,
            info,
            type,
            selected,
            destructive,
            inline,
            descriptionNumberOfLines,
            longInfo,
            nonDestructiveDescription,
            isRadioCheckmark,
            {
                action: onAction,
                onRemove,
                testID: 'optionItem.cl',
            },
        ]),
        [description, descriptionNumberOfLines, destructive, icon, iconColor, info, inline, isRadioCheckmark, label, longInfo, nonDestructiveDescription, selected, type, typePosibilities],
    );

    return (
        <>
            {labelSelector}
            {descriptionSelector}
            {iconSelector}
            {iconColorSelector}
            {infoSelector}
            {typeSelector}
            {selectedSelector}
            {destructiveSelector}
            {inlineSelector}
            {descriptionLinesSelector}
            {longInfoSelector}
            {nonDestructiveDescriptionSelector}
            {isRadioCheckmarkSelector}
            <View>{components}</View>
        </>
    );
};

export default OptionItemComponentLibrary;
