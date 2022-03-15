// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';
import {Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import FloatingCallContainer from './floating_call_container';

function testSafeAreaProvider(children) {
    return (
        <SafeAreaProvider
            initialMetrics={{
                frame: {x: 0, y: 0, width: 0, height: 0},
                insets: {top: 0, left: 0, right: 0, bottom: 0},
            }}
        >
            {children}
        </SafeAreaProvider>
    );
}

describe('FloatingCallContainer', () => {
    test('should match snapshot', () => {
        const wrapper = shallow(testSafeAreaProvider(
            <FloatingCallContainer><Text>{'test'}</Text></FloatingCallContainer>,
        ));

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
