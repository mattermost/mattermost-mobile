// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform} from 'react-native';

import MenuDivider from '@components/menu_divider';

type SettingSeparatorProps = {
    isGroupSeparator?: boolean;
}

const SettingSeparator = ({isGroupSeparator = false}: SettingSeparatorProps) => {
    if (Platform.OS === 'android') {
        return null;
    }
    return (
        <MenuDivider
            marginBottom={isGroupSeparator ? 16 : 0}
            marginTop={0}
        />
    );
};

export default SettingSeparator;
