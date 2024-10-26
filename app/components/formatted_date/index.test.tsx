// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import locales from '../../i18n/languages';

import FormattedDate, {type FormattedDateFormat} from './index';

const DATE = new Date('2024-10-26T10:01:04.653Z');
const FORMATS = [
    undefined,
    {weekday: 'long'},
    {dateStyle: 'medium'},
    {month: 'short', day: 'numeric'},
    {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    },
    {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    },
] satisfies Array<FormattedDateFormat | undefined>;

const TEST_MATRIX = Object.keys(locales).
    map((locale) => FORMATS.map<[string, FormattedDateFormat | undefined]>((format) => [locale, format])).
    flat(1);

describe('<FormattedDate/>', () => {
    it.each(TEST_MATRIX)("should match snapshot for '%s' locale and '%p' format", (locale, format) => {
        const wrapper = renderWithIntl(
            <FormattedDate
                format={format}
                value={DATE}
                timezone='UTC'
            />,
            {locale},
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
