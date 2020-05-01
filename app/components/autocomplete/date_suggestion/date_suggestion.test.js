// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import DateSuggestion from './date_suggestion';

const contextStub = {
    context: {
        intl: {
            formatDate: jest.fn(),
            formatTime: jest.fn(),
            formatRelative: jest.fn(),
            formatNumber: jest.fn(),
            formatPlural: jest.fn(),
            formatHTMLMessage: jest.fn(),
            now: jest.fn(),
            formatMessage: jest.fn(() => ''),
        },
    },
};
describe('DateSuggestion', () => {
    const baseProps = {
        cursorPosition: 12,
        locale: '',
        theme: {},
        enableDateSuggestion: false,
        onChangeText: jest.fn(),
        onResultCountChange: jest.fn(),
    };

    test('should render component without error', () => {
        const wrapper = shallow(
            <DateSuggestion {...baseProps}/>,
            contextStub,
        ).setContext(contextStub);
        expect(wrapper.type()).toEqual(null);
    });
});
