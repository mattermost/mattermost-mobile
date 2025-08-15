// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import OptionItem, {type OptionItemProps, type OptionType} from '@components/option_item';

type Props = Omit<OptionItemProps, 'type'> & {
    type?: OptionType;
}

const PickerOption = ({type, ...rest}: Props) => {
    const testID = `post_priority_picker_item.${rest.value || 'standard'}`;

    return (
        <OptionItem
            testID={testID}
            type={type || 'select'}
            {...rest}
        />
    );
};

export default PickerOption;
