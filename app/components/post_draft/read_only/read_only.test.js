// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import TestRenderer from 'react-test-renderer';
import {IntlProvider} from 'react-intl';

import Preferences from '@mm-redux/constants/preferences';

import ReadOnly from './index';

describe('PostDraft ReadOnly', () => {
    test('Should match snapshot', () => {
        const wrapper = renderWithIntl(
            <ReadOnly
                theme={Preferences.THEMES.default}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});

function renderWithIntl(component) {
    return TestRenderer.create(
        <IntlProvider locale='en'>
            {component}
        </IntlProvider>,
    );
}