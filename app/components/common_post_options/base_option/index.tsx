// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl, type MessageDescriptor} from 'react-intl';

import OptionItem from '@components/option_item';

type BaseOptionType = {
    message: MessageDescriptor;
    iconName: string;
    isDestructive?: boolean;
    onPress: () => void;
    testID: string;
}

const BaseOption = ({
    message,
    iconName,
    isDestructive = false,
    onPress,
    testID,
}: BaseOptionType) => {
    const intl = useIntl();

    return (
        <OptionItem
            action={onPress}
            destructive={isDestructive}
            icon={iconName}
            label={intl.formatMessage(message)}
            testID={testID}
            type='default'
        />
    );
};
export default BaseOption;
