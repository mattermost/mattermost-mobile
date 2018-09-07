// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import {createMembersSections, loadingText} from 'app/utils/member_list';

import CustomList from './index';

describe('CustomList', () => {
    function emptyFunc() {} // eslint-disable-line no-empty-function

    const baseProps = {
        data: [{username: 'username_1'}, {username: 'username_2'}],
        theme: {centerChannelBg: '#aaa', centerChannelColor: '#aaa'},
        searching: false,
        onListEndReached: emptyFunc,
        onListEndReachedThreshold: 0,
        loading: false,
        loadingText,
        listPageSize: 0,
        listInitialSize: 0,
        listScrollRenderAheadDistance: 0,
        showSections: true,
        onRowPress: emptyFunc,
        selectable: true,
        onRowSelect: emptyFunc,
        renderRow: emptyFunc,
        createSections: createMembersSections,
        showNoResults: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <CustomList {...baseProps}/>
        );
        expect(wrapper).toMatchSnapshot();
        expect(wrapper.state('data')).toEqual({U: baseProps.data});

        // on componentWillReceiveProps
        const newDataProps = [{username: 'username_1'}, {username: 'username_2'}, {username: 'username_3'}];
        wrapper.setProps({data: newDataProps});
        expect(wrapper.state('data')).toEqual({U: newDataProps});
    });

    test('should match return value on buildDataSource', () => {
        const props = {...baseProps};
        const wrapper = shallow(
            <CustomList {...props}/>
        );

        expect(wrapper.instance().buildDataSource(props).data).toEqual({U: [{username: 'username_1'}, {username: 'username_2'}]});
        const newDataProps = [{username: 'aaa_1'}, {username: 'aaa_2'}, {username: 'username_1'}, {username: 'username_2'}, {username: 'username_3'}];
        props.data = newDataProps;
        expect(wrapper.instance().buildDataSource(props).data).toEqual({
            A: [{username: 'aaa_1'}, {username: 'aaa_2'}],
            U: [{username: 'username_1'}, {username: 'username_2'}, {username: 'username_3'}],
        });
    });

    test('should match snapshot, renderSectionHeader', () => {
        const wrapper = shallow(
            <CustomList {...baseProps}/>
        );
        expect(wrapper.instance().renderSectionHeader([], 'section_id')).toMatchSnapshot();
    });

    test('should call props.renderRow on renderRow', () => {
        const props = {...baseProps, renderRow: jest.fn()};
        const wrapper = shallow(
            <CustomList {...props}/>
        );
        wrapper.instance().renderRow({id: 'item_id', selected: true}, 'section_id', 'row_id');
        expect(props.renderRow).toHaveBeenCalledTimes(1);
    });

    test('should match snapshot, renderSeparator', () => {
        const wrapper = shallow(
            <CustomList {...baseProps}/>
        );
        expect(wrapper.instance().renderSeparator('section_id', 'row_id')).toMatchSnapshot();
    });

    test('should match snapshot, renderFooter', () => {
        const props = {...baseProps};
        const wrapper = shallow(
            <CustomList {...props}/>
        );

        // should return null
        expect(wrapper.instance().renderFooter()).toMatchSnapshot();

        // should return element
        wrapper.setProps({loading: true});
        expect(wrapper.instance().renderFooter()).toMatchSnapshot();
    });
});
