// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Preferences} from '@constants';
import {act, fireEvent, renderWithIntl} from '@test/intl-test-helper';
import {changeOpacity} from '@utils/theme';

import {goToPostUpdate} from '../navigation';

import StatusUpdateIndicator from './status_update_indicator';

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(CompassIcon).mockImplementation(
    (props) => React.createElement('CompassIcon', {testID: 'compass-icon', ...props}) as any, // override the type since it is expecting a class component
);

jest.mock('../navigation', () => ({
    goToPostUpdate: jest.fn(),
}));

describe('StatusUpdateIndicator', () => {
    const futureTimestamp = Date.now() + 86400000; // 24 hours from now
    const pastTimestamp = Date.now() - 86400000; // 24 hours ago

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders due status correctly', () => {
        const {getByText, getByTestId} = renderWithIntl(
            <StatusUpdateIndicator
                isFinished={false}
                timestamp={futureTimestamp}
                isParticipant={true}
                playbookRunId='run-id'
            />,
        );

        const text = getByText(/Update due/);
        expect(text).toHaveStyle({color: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.72)});

        const icon = getByTestId('compass-icon');
        expect(icon.props.name).toBe('clock-outline');
        expect(StyleSheet.flatten(icon.props.style)).toEqual(expect.objectContaining({color: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.72)}));
    });

    it('renders overdue status correctly', () => {
        const {getByText, getByTestId} = renderWithIntl(
            <StatusUpdateIndicator
                isFinished={false}
                timestamp={pastTimestamp}
                isParticipant={true}
                playbookRunId='run-id'
            />,
        );

        const text = getByText(/Update overdue/);
        expect(text).toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});

        const icon = getByTestId('compass-icon');
        expect(icon.props.name).toBe('clock-outline');
        expect(StyleSheet.flatten(icon.props.style)).toEqual(expect.objectContaining({color: Preferences.THEMES.denim.dndIndicator}));
    });

    it('renders finished status correctly', () => {
        const {getByText, getByTestId} = renderWithIntl(
            <StatusUpdateIndicator
                isFinished={true}
                timestamp={pastTimestamp}
                isParticipant={true}
                playbookRunId='run-id'
            />,
        );

        const text = getByText(/Finished/);
        expect(text).toHaveStyle({color: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.72)});

        const icon = getByTestId('compass-icon');
        expect(icon.props.name).toBe('flag-checkered');
        expect(StyleSheet.flatten(icon.props.style)).toEqual(expect.objectContaining({color: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.72)}));
    });

    it('navigates to post update on press', () => {
        const {getByText} = renderWithIntl(
            <StatusUpdateIndicator
                isFinished={false}
                timestamp={futureTimestamp}
                isParticipant={true}
                playbookRunId='run-id'
            />,
        );

        const button = getByText('Post update');
        act(() => {
            fireEvent.press(button);
        });

        expect(goToPostUpdate).toHaveBeenCalledWith(expect.anything(), 'run-id');
    });

    it('does not navigate to post update if run is finished', () => {
        const {getByText} = renderWithIntl(
            <StatusUpdateIndicator
                isFinished={true}
                timestamp={futureTimestamp}
                isParticipant={true}
                playbookRunId='run-id'
            />,
        );

        const button = getByText('Post update');
        act(() => {
            fireEvent.press(button);
        });

        expect(goToPostUpdate).not.toHaveBeenCalled();
    });
});
