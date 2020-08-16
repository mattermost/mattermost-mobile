// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import TestRenderer from 'react-test-renderer';
import {IntlProvider} from 'react-intl';
import moment from 'moment-timezone';

import FormattedTime from './formatted_time';

describe('FormattedTime', () => {
    const baseProps = {
        value: 1548788533405,
        timeZone: 'UTC',
        hour12: true,
    };

    it('should render correctly', () => {
        console.error = jest.fn();

        let wrapper = renderWithIntl(
            <FormattedTime {...baseProps}/>,
        );
        let element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === '7:02 PM');

        expect(wrapper.baseElement).toMatchSnapshot();
        expect(element).toBeTruthy();

        wrapper = renderWithIntl(
            <FormattedTime
                {...baseProps}
                hour12={false}
            />,
        );

        element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === '19:02');
        expect(element).toBeTruthy();
    });

    it('should support localization', () => {
        moment.locale('es');
        let wrapper = renderWithIntl(
            <FormattedTime {...baseProps}/>,
            'es',
        );

        let element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === '7:02 PM');
        expect(element).toBeTruthy();

        moment.locale('ko');
        wrapper = renderWithIntl(
            <FormattedTime {...baseProps}/>,
            'ko',
        );

        element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === '오후 7:02');
        expect(element).toBeTruthy();

        wrapper = renderWithIntl(
            <FormattedTime
                {...baseProps}
                hour12={false}
            />,
            'ko',
        );

        element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === '19:02');
        expect(element).toBeTruthy();
    });

    it('should fallback to default short format for unsupported locale of react-intl ', () => {
        moment.locale('es');
        let wrapper = renderWithIntl(
            <FormattedTime
                {...baseProps}
                timeZone='NZ-CHAT'
            />,
            'es',
        );

        let element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === '8:47 AM');
        expect(element).toBeTruthy();

        wrapper = renderWithIntl(
            <FormattedTime
                {...baseProps}
                timeZone='NZ-CHAT'
                hour12={false}
            />,
            'es',
        );

        element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === '8:47');
        expect(element).toBeTruthy();
    });
});

function renderWithIntl(component, locale = 'en') {
    return TestRenderer.create(<IntlProvider locale={locale}>{component}</IntlProvider>);
}
