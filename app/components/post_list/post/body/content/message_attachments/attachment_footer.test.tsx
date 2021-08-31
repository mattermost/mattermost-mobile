// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from '@constants/preferences';
import {render} from '@test/intl-test-helper';

import AttachmentFooter from './attachment_footer';

describe('AttachmentFooter', () => {
    const baseProps = {
        text: 'This is the footer!',
        icon: 'https://images.com/image.png',
        theme: Preferences.THEMES.denim,
    };

    test('it matches snapshot when footer text is provided', () => {
        const props = {
            ...baseProps,
            icon: undefined,
        };

        const wrapper = render(<AttachmentFooter {...props}/>);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('it matches snapshot when both footer and footer_icon are provided', () => {
        const wrapper = render(<AttachmentFooter {...baseProps}/>);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
