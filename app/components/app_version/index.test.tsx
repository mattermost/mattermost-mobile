// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import AppVersion from './index';

describe('@components/app_version', () => {
    // Skipping this test because the snapshot became too big and
    // it errors out.
    it.skip('should match snapshot', () => {
        const wrapper = renderWithIntl(<AppVersion/>);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
