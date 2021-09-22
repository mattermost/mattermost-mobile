// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import AddReaction from './index';

describe('AddReaction', () => {
    const baseProps = {
        onEmojiPress: jest.fn(),
        componentId: 'component-id',
        closeButton: {},
    };

    test('should match snapshot', () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const wrapper = renderWithIntl(<AddReaction {...baseProps}/>);

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
