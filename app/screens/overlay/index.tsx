// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {View} from 'react-native';

import SecurityManager from '@managers/security_manager';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    children: ReactNode;
}

const Overlay = ({children, componentId}: Props) => {
    return (<View nativeID={SecurityManager.getShieldScreenId(componentId)}>{children}</View>);
};

export default Overlay;
