// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from 'mattermost-redux/constants/preferences';

import MarkdownTable from './markdown_table';

describe('MarkdownTable', () => {
    const createCell = (type, children = null) => {
        return React.createElement('', {key: Date.now(), className: type}, children);
    };

    const numColumns = 10;
    const children = [];
    for (let i = 0; i <= numColumns; i++) {
        const cols = [];
        for (let j = 0; j <= numColumns; j++) {
            cols.push(createCell('col'));
        }

        children.push(createCell('row', cols));
    }

    const baseProps = {
        children,
        numColumns,
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <MarkdownTable {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should slice rows and columns', () => {
        const wrapper = shallowWithIntl(
            <MarkdownTable {...baseProps}/>
        );

        const {maxPreviewColumns} = wrapper.state();
        expect(wrapper.find('.row')).toHaveLength(maxPreviewColumns);
        expect(wrapper.find('.col')).toHaveLength(Math.pow(maxPreviewColumns, 2));

        const newMaxPreviewColumns = maxPreviewColumns - 1;
        wrapper.setState({maxPreviewColumns: newMaxPreviewColumns});
        expect(wrapper.find('.row')).toHaveLength(newMaxPreviewColumns);
        expect(wrapper.find('.col')).toHaveLength(Math.pow(newMaxPreviewColumns, 2));
    });
});
