// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Badge from './badge';

describe('components/channel_list/categories/body/channel/badge', () => {
    it('should match snapshot', () => {
        const wrapper = renderWithIntlAndTheme(
            <Badge
                count={10}
                muted={false}
            />,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
