// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Alert, View} from 'react-native';

import Button from '@components/button';
import {useTheme} from '@context/theme';

import {useBooleanProp, useDropdownProp, useStringProp} from './hooks';
import {buildComponent} from './utils';

const propPossibilities = {};

const buttonSizeValues = ['xs', 's', 'm', 'lg'];
const buttonEmphasisValues = ['primary', 'secondary', 'tertiary', 'link'];

const onPress = () => Alert.alert('Button pressed!');

const ButtonComponentLibrary = () => {
    const theme = useTheme();
    const [text, textSelector] = useStringProp('text', 'Some text', false);
    const [disabled, disabledSelector] = useBooleanProp('disabled', false);
    const [buttonSize, buttonSizePosibilities, buttonSizeSelector] = useDropdownProp('size', 'm', buttonSizeValues, true);
    const [buttonEmphasis, buttonEmphasisPosibilities, buttonEmphasisSelector] = useDropdownProp('emphasis', 'primary', buttonEmphasisValues, true);
    const [iconName, iconNameSelector] = useStringProp('iconName', '', true);
    const [isIconOnTheRight, isIconOnTheRightSelector] = useBooleanProp('isIconOnTheRight', false);
    const [showLoader, showLoaderSelector] = useBooleanProp('showLoader', false);
    const [isInverted, isInvertedSelector] = useBooleanProp('isInverted', false);
    const [isDestructive, isDestructiveSelector] = useBooleanProp('isDestructive', false);

    const components = useMemo(
        () => buildComponent(Button, propPossibilities, [
            buttonSizePosibilities,
            buttonEmphasisPosibilities,
        ], [
            text,
            disabled,
            buttonSize,
            buttonEmphasis,
            iconName,
            isIconOnTheRight,
            showLoader,
            isInverted,
            isDestructive,
            {
                theme,
                onPress,
            },
        ]),
        [buttonEmphasis, buttonEmphasisPosibilities, buttonSize, buttonSizePosibilities, disabled, text, theme, iconName, isIconOnTheRight, showLoader, isInverted, isDestructive],
    );

    return (
        <>
            {textSelector}
            {disabledSelector}
            {buttonSizeSelector}
            {buttonEmphasisSelector}
            {iconNameSelector}
            {isIconOnTheRightSelector}
            {showLoaderSelector}
            {isInvertedSelector}
            {isDestructiveSelector}
            <View>{components}</View>
        </>
    );
};

export default ButtonComponentLibrary;
