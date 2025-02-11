import React from 'react';
import {DeviceEventEmitter} from 'react-native';

import {switchToGlobalDrafts} from '@actions/local/draft';
import {Events} from '@constants';
import {DRAFT} from '@constants/screens';
import {renderWithEverything} from '@test/intl-test-helper';

import DraftsButton from '../drafts_button';

jest.mock('@actions/local/draft', () => ({
    switchToGlobalDrafts: jest.fn(),
}));

describe('components/drafts_button/DraftsButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const baseProps = {
        draftsCount: 0,
        scheduledPostCount: 0,
        scheduledPostHasError: false,
    };

    test('should match snapshot', () => {
        const wrapper = renderWithEverything(
            <DraftsButton {...baseProps}/>,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('should show draft count when greater than 0', () => {
        const props = {
            ...baseProps,
            draftsCount: 5,
        };

        const {getByTestId} = renderWithEverything(
            <DraftsButton {...props}/>,
        );

        expect(getByTestId('channel_list.drafts.count')).toHaveTextContent('5');
    });

    test('should show scheduled post count when greater than 0', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 3,
        };

        const {getByTestId} = renderWithEverything(
            <DraftsButton {...props}/>,
        );

        expect(getByTestId('channel_list.schedued_post.count')).toHaveTextContent('3');
    });

    test('should apply error styles when scheduled post has error', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 1,
            scheduledPostHasError: true,
        };

        const {getByTestId} = renderWithEverything(
            <DraftsButton {...props}/>,
        );

        const countElement = getByTestId('channel_list.schedued_post.count');
        expect(countElement).toBeVisible();
        expect(countElement.parent).toHaveStyle({backgroundColor: expect.any(String)});
    });

    test('should handle press and emit events', () => {
        const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
        
        const {getByTestId} = renderWithEverything(
            <DraftsButton {...baseProps}/>,
        );

        const button = getByTestId('channel_list.drafts.button');
        button.props.onPress();

        expect(emitSpy).toHaveBeenCalledWith(Events.ACTIVE_SCREEN, DRAFT);
        expect(switchToGlobalDrafts).toHaveBeenCalled();
    });
});
