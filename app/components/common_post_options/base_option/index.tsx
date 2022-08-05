// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';

type BaseOptionType = {
    defaultMessage: string;
    i18nId: string;
    iconName: string;
    isDestructive?: boolean;
    onPress: () => void;
    testID: string;
}

const BaseOption = ({
    defaultMessage,
    i18nId,
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
            label={intl.formatMessage({id: i18nId, defaultMessage})}
            testID={testID}
            type='default'
        />
    );
};
export default BaseOption;
