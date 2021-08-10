// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

const Placeholder2 = (props: any) => {
    const {componentId} = props;
    // eslint-disable-next-line no-console
    console.log(`>>>>>>>>>>>>>>> Placeholder2 ${componentId}  MOUNTED <<<<<<<<<<<<<<<`, {props});

    return [
        <View
            testID='placeholder.screen'
            key='placeholder.screen'
            style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}
        >
            <Text style={{color: 'white', fontSize: 30}}>{` ${componentId} Screen `}</Text>

        </View>,
    ];
};

export default Placeholder2;
