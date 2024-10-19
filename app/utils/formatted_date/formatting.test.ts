// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import languages from '@app/i18n/languages';

import {formattedDateTime_moment, formattedDateTime_intl} from './formatted_datetime';

import type {FormatDateOptions} from 'react-intl';

const MOMENT_FORMATS = [
    'MMM DD HH:MM A',
    'MMM DD YYYY HH:MM A',
    'dddd',
    'MMM DD',
    'MMM DD, YYYY',
];

const INTL_FORMATS: { [key: string]: FormatDateOptions } = {
    'MMM DD HH:MM A': {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    },
    'MMM DD YYYY HH:MM A': {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    },
    dddd: {
        weekday: 'long',
    },
    'MMM DD': {
        month: 'short',
        day: '2-digit',
    },
    'MMM DD, YYYY': {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    },
};

describe.each(MOMENT_FORMATS)('formattedDateTime', (format: string) => {
    const theResult: string[] = [];

    const theLanguages = Object.keys(languages);

    afterAll(() => {
        expect(theResult).toMatchSnapshot();
    });

    it.each(theLanguages)(`format: ${format}`, (locale) => {
        const theDate = new Date('2021-09-02T00:00:00Z');
        const formatMoment = formattedDateTime_moment(theDate, locale, format);
        const formatIntl = formattedDateTime_intl(theDate, locale, INTL_FORMATS[format]);

        theResult.push(`${locale} :: ${formatMoment}   ===>   ${formatIntl}`);
    });
});
