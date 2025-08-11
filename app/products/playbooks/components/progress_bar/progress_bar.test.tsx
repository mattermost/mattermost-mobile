// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {Preferences} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

import ProgressBar from './progress_bar';

jest.mock('@context/theme', () => ({
    useTheme: jest.fn(),
}));
jest.mocked(useTheme).mockReturnValue(Preferences.THEMES.denim);

describe('ProgressBar', () => {
    function getBaseProps(): ComponentProps<typeof ProgressBar> {
        return {
            progress: 50,
            isActive: true,
            testID: 'progress-bar',
        };
    }

    it('renders correctly with active state', () => {
        const props = getBaseProps();
        props.isActive = true;
        props.progress = 50;

        const {getByTestId} = render(<ProgressBar {...props}/>);

        const progressBar = getByTestId('progress-bar');
        expect(progressBar).toBeTruthy();
        expect(progressBar).toHaveStyle({
            width: '50%',
            backgroundColor: Preferences.THEMES.denim.onlineIndicator,
        });
    });

    it('renders correctly with inactive state', () => {
        const props = getBaseProps();
        props.isActive = false;
        props.progress = 75;

        const {getByTestId} = render(<ProgressBar {...props}/>);

        const progressBar = getByTestId('progress-bar');
        expect(progressBar).toBeTruthy();
        expect(progressBar).toHaveStyle({
            width: '75%',
            backgroundColor: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.4),
        });
    });

    it('handles 0% progress', () => {
        const props = getBaseProps();
        props.progress = 0;

        const {getByTestId} = render(<ProgressBar {...props}/>);

        const progressBar = getByTestId('progress-bar');
        expect(progressBar).toHaveStyle({
            width: '0%',
        });
    });

    it('handles 100% progress', () => {
        const props = getBaseProps();
        props.progress = 100;

        const {getByTestId} = render(<ProgressBar {...props}/>);

        const progressBar = getByTestId('progress-bar');
        expect(progressBar).toHaveStyle({
            width: '100%',
        });
    });
});
