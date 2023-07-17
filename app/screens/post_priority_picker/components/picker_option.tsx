// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import OptionItem, {type OptionItemProps, type OptionType} from '@components/option_item';

const style = StyleSheet.create({
    labelContainer: {
        alignItems: 'flex-start',
    },
});

type Props = Omit<OptionItemProps, 'type'> & {
    type?: OptionType;
}

const PickerOption = ({type, ...rest}: Props) => {
    const testID = `post_priority_picker_item.${rest.value || 'standard'}`;

    return (
        <OptionItem
            labelContainerStyle={style.labelContainer}
            testID={testID}
            type={type || 'select'}
            {...rest}
        />
    );
};

export default PickerOption;
