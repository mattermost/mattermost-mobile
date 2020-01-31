// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render} from '@testing-library/react-native';
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

        expect(wrapper.baseElement).toMatchSnapshot();
        expect(wrapper.getByText('7:02 PM')).toBeTruthy();

        wrapper = renderWithIntl(
            <FormattedTime
                {...baseProps}
                hour12={false}
            />,
        );

        expect(wrapper.getByText('19:02')).toBeTruthy();
    });

    it('should support localization', () => {
        moment.locale('es');
        let wrapper = renderWithIntl(
            <FormattedTime {...baseProps}/>,
            'es',
        );

        expect(wrapper.getByText('7:02 PM')).toBeTruthy();

        moment.locale('ko');
        wrapper = renderWithIntl(
            <FormattedTime {...baseProps}/>,
            'ko',
        );

        expect(wrapper.getByText('오후 7:02')).toBeTruthy();

        wrapper = renderWithIntl(
            <FormattedTime
                {...baseProps}
                hour12={false}
            />,
            'ko',
        );

        expect(wrapper.getByText('19:02')).toBeTruthy();
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

        expect(wrapper.getByText('8:47 AM')).toBeTruthy();

        wrapper = renderWithIntl(
            <FormattedTime
                {...baseProps}
                timeZone='NZ-CHAT'
                hour12={false}
            />,
            'es',
        );

        expect(wrapper.getByText('8:47')).toBeTruthy();
    });
});

function renderWithIntl(component, locale = 'en') {
    return render(<IntlProvider locale={locale}>{component}</IntlProvider>);
}
