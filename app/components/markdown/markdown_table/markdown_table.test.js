// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from 'mattermost-redux/constants/preferences';

import MarkdownTable from './markdown_table';

const Element = React.cloneElement('', null, '');

describe('MarkdownTable', () => {
    const baseProps = {
        children: [Element],
        numColumns: 10,
        deviceWidth: 100,
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <MarkdownTable {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
