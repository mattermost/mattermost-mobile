// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import TermsOfService from './terms_of_service.js';

jest.mock('react-intl');

jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

describe('TermsOfService', () => {
    const actions = {
        getTermsOfService: jest.fn(),
        updateMyTermsOfServiceStatus: jest.fn(),
        logout: jest.fn(),
        setButtons: jest.fn(),
        dismissModal: jest.fn(),
        dismissAllModals: jest.fn(),
    };

    const baseProps = {
        actions,
        theme: Preferences.THEMES.default,
        closeButton: {},
        siteName: 'Mattermost',
        componentId: 'component-id',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <TermsOfService {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for get terms', async () => {
        const wrapper = shallow(
            <TermsOfService {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        await actions.getTermsOfService();
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for fail of get terms', async () => {
        const getTermsOfService = async () => {
            return {
                error: {},
            };
        };

        const props = {
            ...baseProps,
            actions: {
                ...actions,
                getTermsOfService,
            },
        };

        const wrapper = shallow(
            <TermsOfService {...props}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.state('loading')).toEqual(true);
        await getTermsOfService();
        expect(wrapper.state('loading')).toEqual(false);
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call props.actions.setButtons on setNavigatorButtons', async () => {
        const wrapper = shallow(
            <TermsOfService {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        wrapper.setState({loading: false, termsId: 1, termsText: 'Terms Text'});

        expect(baseProps.actions.setButtons).toHaveBeenCalledTimes(2);
        wrapper.instance().setNavigatorButtons(true);
        expect(baseProps.actions.setButtons).toHaveBeenCalledTimes(3);
        wrapper.instance().setNavigatorButtons(false);
        expect(baseProps.actions.setButtons).toHaveBeenCalledTimes(4);
    });

    test('should enable/disable navigator buttons on setNavigatorButtons true/false', () => {
        const wrapper = shallow(
            <TermsOfService {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        wrapper.setState({loading: false, termsId: 1, termsText: 'Terms Text'});

        wrapper.instance().setNavigatorButtons(true);
        expect(wrapper.getElement()).toMatchSnapshot();
        wrapper.instance().setNavigatorButtons(false);
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot on enableNavigatorLogout', () => {
        const wrapper = shallow(
            <TermsOfService {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.setState({loading: false, termsId: 1, termsText: 'Terms Text'});
        wrapper.instance().enableNavigatorLogout();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call dismissAllModals on closeTermsAndLogout', () => {
        const wrapper = shallow(
            <TermsOfService {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.setState({loading: false, termsId: 1, termsText: 'Terms Text'});
        wrapper.instance().closeTermsAndLogout();
        expect(baseProps.actions.dismissAllModals).toHaveBeenCalledTimes(1);
    });
});
