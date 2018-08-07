// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import LoadingPlaceholder from './index.js';

describe('LoadingPlaceholder', () => {
    test('should match snapshot', () => {
        const wrapper = shallow(
            <LoadingPlaceholder/>
        );

        expect(wrapper).toMatchSnapshot();
    });
});
