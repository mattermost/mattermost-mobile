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
const buttonTypeValues = ['default', 'destructive', 'inverted', 'disabled'];
const buttonStateValues = ['default', 'hover', 'active', 'focus'];

const onPress = () => Alert.alert('Button pressed!');

const ButtonComponentLibrary = () => {
    const theme = useTheme();
    const [text, textSelector] = useStringProp('text', 'Some text', false);
    const [disabled, disabledSelector] = useBooleanProp('disabled', false);
    const [buttonSize, buttonSizePosibilities, buttonSizeSelector] = useDropdownProp('size', 'm', buttonSizeValues, true);
    const [buttonEmphasis, buttonEmphasisPosibilities, buttonEmphasisSelector] = useDropdownProp('emphasis', 'primary', buttonEmphasisValues, true);
    const [buttonType, buttonTypePosibilities, buttonTypeSelector] = useDropdownProp('buttonType', 'default', buttonTypeValues, true);
    const [buttonState, buttonStatePosibilities, buttonStateSelector] = useDropdownProp('buttonState', 'default', buttonStateValues, true);

    const components = useMemo(
        () => buildComponent(Button, propPossibilities, [
            buttonSizePosibilities,
            buttonEmphasisPosibilities,
            buttonTypePosibilities,
            buttonStatePosibilities,
        ], [
            text,
            disabled,
            buttonSize,
            buttonEmphasis,
            buttonType,
            buttonState,
            {
                theme,
                onPress,
            },
        ]),
        [buttonEmphasis, buttonEmphasisPosibilities, buttonSize, buttonSizePosibilities, buttonState, buttonStatePosibilities, buttonType, buttonTypePosibilities, disabled, text, theme],
    );

    return (
        <>
            {textSelector}
            {disabledSelector}
            {buttonSizeSelector}
            {buttonEmphasisSelector}
            {buttonTypeSelector}
            {buttonStateSelector}
            <View>{components}</View>
        </>
    );
};

export default ButtonComponentLibrary;
