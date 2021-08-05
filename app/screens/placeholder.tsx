// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {NavigationComponentProps, NavigationFunctionComponent} from 'react-native-navigation';

interface PlaceholderProps extends NavigationComponentProps {
    componentId: string;
    theme: Theme;
}

const Placeholder: NavigationFunctionComponent = (props: PlaceholderProps) => {
    let backgroundColor;
    const {componentId} = props;
    console.log(`>>>>>>>>>>>>>>> ${componentId}  MOUNTED <<<<<<<<<<<<<<<`);

    switch (componentId) {
        case '_HOME_': {
            backgroundColor = 'red';
            break;
        } case '_USER_': {
            backgroundColor = 'blue';
            break;
        } case '_SEARCH_': {
            backgroundColor = 'brown';
            break;
        }
        default : {
            backgroundColor = 'green';
            break;
        }
    }
    return (
        <View
            testID='placeholder.screen'
            style={{backgroundColor, flex: 1, alignItems: 'center', justifyContent: 'center'}}
        >
            <Text style={{color: 'white', fontSize: 30}}>{` ${componentId} Screen `}</Text>
        </View>
    );
};

export default Placeholder;
