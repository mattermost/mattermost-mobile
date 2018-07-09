// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {DATE_LINE, DATE_LINE_SUFFIX} from 'app/selectors/post_list';
import DateHeader from 'app/components/post_list/date_header';

// DateLine builds a DateHeader given a date encoded as a string in a post list.
export class DateLine extends PureComponent {
    static propTypes = {
        dateString: PropTypes.string.isRequired,
        index: PropTypes.number.isRequired,
    };

    render() {
        const {dateString, index} = this.props;
        const date = new Date(dateString.substring(DATE_LINE.length, dateString.indexOf(DATE_LINE_SUFFIX)));

        return (
            <DateHeader
                key={`${date}-${index}`}
                date={date}
                index={index}
            />
        );
    }
}

export const isDateLine = (dateString) => dateString.indexOf(DATE_LINE) === 0;
