// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {goToScreen, showModal} from '@screens/navigation';
import BottomTabBar from '@screens/tabs/bottom_tab_bar';
import React from 'react';
import {Text, View} from 'react-native';
import {NavigationComponentProps, NavigationFunctionComponent} from 'react-native-navigation';

interface PlaceholderProps extends NavigationComponentProps {
    componentId: string;
}

const Placeholder: NavigationFunctionComponent = (props: PlaceholderProps) => {
    let backgroundColor;
    const {componentId} = props;
    // eslint-disable-next-line no-console
    console.log(`>>>>>>>>>>>>>>> ${componentId}  MOUNTED <<<<<<<<<<<<<<<`, {
        props,
    });

    switch (componentId) {
        case 'TAB_HOME_': {
            backgroundColor = 'grey';
            break;
        }
        case 'TAB_USER_': {
            backgroundColor = 'blue';
            break;
        }
        case 'TAB_SEARCH_': {
            backgroundColor = 'brown';
            break;
        }
        default: {
            backgroundColor = 'green';
            break;
        }
    }

    const renderOnHomeOnly = () => {
        return (
            <View style={{marginTop: 30, alignItems: 'center'}}>
                <Text
                    style={{marginBottom: 15}}
                    onPress={() => {
                        return showModal('Placeholder2', 'modal');
                    }}
                >
                    {'Open Modal'}
                </Text>
                <Text
                    onPress={() => {
                        return goToScreen('Placeholder2', 'Placeholder2');
                    }}
                >
                    {'Go to another screen'}
                </Text>
            </View>
        );
    };

    return [
        <View
            testID='placeholder.screen'
            key='placeholder.screen'
            style={{
                backgroundColor,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text
                style={{color: 'white', fontSize: 30}}
            >{` ${componentId} Screen `}</Text>
            {componentId === 'TAB_HOME_' && renderOnHomeOnly()}
        </View>,
        <BottomTabBar key='bottom.tabbar'/>,
    ];
};

Placeholder.options = {
    topBar: {
        visible: false,
        title: {
            color: '#fff',
            text: '1st screen',
        },
    },
};

export default Placeholder;
