// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from '@constants/preferences';
import {renderWithIntl} from '@test/intl-test-helper';

import AttachmentAuthor from './attachment_author';

describe('AttachmentAuthor', () => {
    const baseProps = {
        link: 'http://linktoatachment.com',
        name: 'jhondoe',
        icon: 'https://images.com/image.png',
        theme: Preferences.THEMES.denim,
    };

    test('it matches snapshot when both name and icon are provided', () => {
        const wrapper = renderWithIntl(<AttachmentAuthor {...baseProps}/>);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('it matches snapshot when only name is provided', () => {
        const props = {
            ...baseProps,
            icon: undefined,
        };

        const wrapper = renderWithIntl(<AttachmentAuthor {...props}/>);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('it matches snapshot when only icon is provided', () => {
        const props = {
            ...baseProps,
            name: undefined,
        };

        const wrapper = renderWithIntl(<AttachmentAuthor {...props}/>);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
