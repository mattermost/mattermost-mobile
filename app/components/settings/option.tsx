// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform} from 'react-native';

import OptionItem, {type OptionItemProps} from '@components/option_item';

const SettingOption = ({...props}: OptionItemProps) => {
    const useRadioButton = props.type === 'select' && Platform.OS === 'android';

    return (
        <OptionItem
            {...props}
            type={useRadioButton ? 'radio' : props.type}
        />
    );
};

export default SettingOption;
