// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Freeze} from 'react-freeze';
import {View} from 'react-native';

import useFreeze from '@hooks/freeze';

type FreezePlaceholderProps = {
    backgroundColor: string;
};

type FreezeScreenProps = {
    children: React.ReactNode;
}

const FreezePlaceholder = ({backgroundColor}: FreezePlaceholderProps) => {
    return <View style={{flex: 1, backgroundColor}}/>;
};

const FreezeScreen = ({children}: FreezeScreenProps) => {
    const {freeze, backgroundColor} = useFreeze();

    const placeholder = (<FreezePlaceholder backgroundColor={backgroundColor}/>);

    return (
        <Freeze
            freeze={freeze}
            placeholder={placeholder}
        >
            {children}
        </Freeze>
    );
};

export default FreezeScreen;
