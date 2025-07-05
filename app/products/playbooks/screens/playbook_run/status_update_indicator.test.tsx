// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Preferences} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';
import {changeOpacity} from '@utils/theme';

import StatusUpdateIndicator from './status_update_indicator';

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(CompassIcon).mockImplementation(
    (props) => React.createElement('CompassIcon', {testID: 'compass-icon', ...props}) as any, // override the type since it is expecting a class component
);

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
            />,
        );

        const text = getByText(/Status update due/);
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
            />,
        );

        const text = getByText(/Status update overdue/);
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
            />,
        );

        const text = getByText(/Run finished/);
        expect(text).toHaveStyle({color: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.72)});

        const icon = getByTestId('compass-icon');
        expect(icon.props.name).toBe('flag-checkered');
        expect(StyleSheet.flatten(icon.props.style)).toEqual(expect.objectContaining({color: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.72)}));
    });
});
