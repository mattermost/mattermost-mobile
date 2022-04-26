// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Freeze} from 'react-freeze';
import {StyleSheet, View} from 'react-native';

import {useIsTablet} from '@hooks/device';
import useFreeze from '@hooks/freeze';

type FreezePlaceholderProps = {
    backgroundColor: string;
};

type FreezeScreenProps = {
    children: React.ReactNode;
    freeze?: boolean;
}

export const FreezePlaceholder = ({backgroundColor}: FreezePlaceholderProps) => {
    return <View style={{flex: 1, backgroundColor}}/>;
};

interface ViewConfig extends View {
    viewConfig: {
      validAttributes: {
        style: {
          display: boolean;
        };
      };
    };
  }

// This solves the keeping of position on Android
const handleRef = (ref: ViewConfig) => {
    if (ref?.viewConfig?.validAttributes?.style) {
        ref.viewConfig.validAttributes.style = {
            ...ref.viewConfig.validAttributes.style,
            display: false,
        };
    }
};

const style = StyleSheet.create({
    freeze: {
        height: '100%',
        width: '100%',
        position: 'absolute',
    },
});

function FreezeScreen({freeze: freezeFromProps, children}: FreezeScreenProps) {
    const {freeze, backgroundColor} = useFreeze();
    const isTablet = useIsTablet();
    const placeholder = (<FreezePlaceholder backgroundColor={backgroundColor}/>);

    let component = children;
    if (!isTablet) {
        component = (
            <View
                ref={handleRef}
                style={style.freeze}
            >
                {children}
            </View>
        );
    }

    return (
        <Freeze
            freeze={freezeFromProps || freeze}
            placeholder={placeholder}
        >
            {component}
        </Freeze>
    );
}

export default FreezeScreen;
