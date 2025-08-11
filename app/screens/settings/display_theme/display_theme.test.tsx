// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import React from 'react';
import {BackHandler} from 'react-native';

import {savePreference} from '@actions/remote/preference';
import {Preferences} from '@constants';
import {useTheme} from '@context/theme';
import {popTopScreen} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {renderWithIntl} from '@test/intl-test-helper';

import DisplayTheme from './display_theme';

import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@screens/navigation');
jest.mock('@context/theme', () => ({
    useTheme: jest.fn(),
}));
jest.mock('@actions/remote/preference');
jest.mock('@store/navigation_store');

const displayThemeOtherProps = {
    componentId: 'DisplayTheme' as AvailableScreens,
    currentTeamId: '1',
    currentUserId: '1',
};

describe('DisplayTheme', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(useTheme).mockImplementation(() => ({...Preferences.THEMES.denim, type: 'Denim'}));
    });

    it('should render with a few themes, denim selected', () => {
        render(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
            />);

        expect(screen.getByTestId('theme_display_settings.denim.option')).toBeTruthy();
        expect(screen.getByTestId('theme_display_settings.denim.option.selected')).toBeTruthy();

        expect(screen.getByTestId('theme_display_settings.sapphire.option')).toBeTruthy();
        expect(screen.queryByTestId('theme_display_settings.sapphire.option.selected')).toBeFalsy();
    });

    it('should render with custom theme, current theme is custom', () => {
        jest.mocked(useTheme).mockImplementation(() => ({...Preferences.THEMES.denim, type: 'custom'}));

        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'custom']}
                {...displayThemeOtherProps}
            />);

        expect(screen.getByTestId('theme_display_settings.custom.option')).toBeTruthy();
        expect(screen.getByTestId('theme_display_settings.custom.option.selected')).toBeTruthy();
    });

    it('should render with custom theme (default) and user change to denim (non-custom)', async () => {
        jest.mocked(useTheme).mockImplementation(() => ({...Preferences.THEMES.denim, type: 'custom'}));

        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'custom']}
                {...displayThemeOtherProps}
            />);

        expect(screen.getByTestId('theme_display_settings.custom.option')).toBeTruthy();
        expect(screen.getByTestId('theme_display_settings.custom.option.selected')).toBeTruthy();

        const denimTile = screen.getByTestId('theme_display_settings.denim.option');

        fireEvent.press(denimTile);

        await waitFor(() => {
            expect(savePreference).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.objectContaining({
                        category: 'theme',
                        value: expect.stringContaining('"type":"Denim"'),
                    }),
                ]),
            );
            expect(savePreference).toHaveBeenCalledTimes(1);
        });

        // since we're mocking useTheme and savePreference, savePreference will post changes to the backend API, and upon success,
        // it will update the `theme` preference via useTheme hook.
        jest.mocked(useTheme).mockImplementation(() => ({...Preferences.THEMES.denim, type: 'Denim'}));

        // clearing the savePreference mock to show that it will not be called again after re-rendering the component
        jest.mocked(savePreference).mockClear();

        screen.rerender(
            <DisplayTheme
                allowedThemeKeys={['denim', 'custom']}
                {...displayThemeOtherProps}
            />,
        );

        expect(savePreference).toHaveBeenCalledTimes(0);

        expect(screen.getByTestId('theme_display_settings.denim.option.selected')).toBeTruthy();
    });

    it('should render only with custom theme, it gets de-selected, and then user re-selects it', async () => {
        jest.mocked(useTheme).mockImplementation(() => ({...Preferences.THEMES.denim, type: 'custom'}));

        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={[]}
                {...displayThemeOtherProps}
            />);

        jest.mocked(useTheme).mockImplementation(() => ({...Preferences.THEMES.denim, type: 'Denim'}));

        screen.rerender(
            <DisplayTheme
                allowedThemeKeys={[]}
                {...displayThemeOtherProps}
            />);

        const customTile = screen.getByTestId('theme_display_settings.custom.option');

        fireEvent.press(customTile);

        await waitFor(() => {
            expect(savePreference).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.objectContaining({
                        category: 'theme',
                        value: expect.stringContaining('"type":"custom"'),
                    }),
                ]),
            );
        });
    });

    it('should render denim, then a different client set the theme to custom, and this client should render custom and automatically switch to it', () => {
        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim']}
                {...displayThemeOtherProps}
            />);

        expect(screen.queryByTestId('theme_display_settings.custom.option.selected')).toBeFalsy();

        jest.mocked(useTheme).mockImplementation(() => ({...Preferences.THEMES.denim, type: 'custom'}));

        screen.rerender(
            <DisplayTheme
                allowedThemeKeys={['denim']}
                {...displayThemeOtherProps}
            />);

        expect(screen.getByTestId('theme_display_settings.custom.option.selected')).toBeTruthy();
    });

    it('should not call popTopScreen (closes the screen) when changing theme', async () => {
        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
            />,
        );

        const sapphireTile = screen.getByTestId('theme_display_settings.sapphire.option');

        fireEvent.press(sapphireTile);

        jest.mocked(useTheme).mockImplementation(() => ({...Preferences.THEMES.sapphire, type: 'Sapphire'}));

        screen.rerender(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
            />,
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme_display_settings.sapphire.option.selected')).toBeTruthy();
        });

        expect(popTopScreen).toHaveBeenCalledTimes(0);
    });

    it('should call popTopScreen when Android back button is pressed', () => {
        (NavigationStore.getVisibleScreen as jest.Mock).mockReturnValue('DisplayTheme');
        const androidBackButtonHandler = jest.spyOn(BackHandler, 'addEventListener');

        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'custom']}
                {...displayThemeOtherProps}
            />,
        );

        // simulate Android back button press
        androidBackButtonHandler.mock.calls[0][1]();

        expect(popTopScreen).toHaveBeenCalledTimes(1);
    });

    it('should allow user to select two different themes using normal interaction', async () => {
        jest.useFakeTimers();

        const numOfSavePreferenceCalls = 2;
        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
            />,
        );

        const sapphireTile = screen.getByTestId('theme_display_settings.sapphire.option');

        fireEvent.press(sapphireTile);

        jest.advanceTimersByTime(750);
        jest.useRealTimers();

        await waitFor(() => {
            expect(savePreference).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.objectContaining({
                        category: 'theme',
                        value: expect.stringContaining('"type":"Sapphire"'),
                    }),
                ]),
            );
            expect(savePreference).toHaveBeenCalledTimes(1);
        });

        jest.useFakeTimers();
        jest.advanceTimersByTime(750);

        const denimTile = screen.getByTestId('theme_display_settings.denim.option');

        fireEvent.press(denimTile);

        // firing denimTile will not cause the savePreference to be called again since we have the prevent double tap
        expect(savePreference).toHaveBeenCalledTimes(numOfSavePreferenceCalls);

        jest.useRealTimers();
    });

    it('should not allow user to select a theme rapidly', async () => {
        const numOfSavePreferenceCalls = 1;
        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
            />,
        );

        const sapphireTile = screen.getByTestId('theme_display_settings.sapphire.option');

        fireEvent.press(sapphireTile);

        await waitFor(() => {
            expect(savePreference).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.objectContaining({
                        category: 'theme',
                        value: expect.stringContaining('"type":"Sapphire"'),
                    }),
                ]),
            );
            expect(savePreference).toHaveBeenCalledTimes(numOfSavePreferenceCalls);
        });

        const denimTile = screen.getByTestId('theme_display_settings.denim.option');

        fireEvent.press(denimTile);

        // firing denimTile will not cause the savePreference to be called again since we have the prevent double tap
        expect(savePreference).toHaveBeenCalledTimes(numOfSavePreferenceCalls);
    });
});
