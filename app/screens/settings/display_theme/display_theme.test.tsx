// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';
import {BackHandler} from 'react-native';

import {savePreference} from '@actions/remote/preference';
import {Preferences, Screens} from '@constants';
import {getDefaultThemeByAppearance, useTheme} from '@context/theme';
import {navigateBack} from '@screens/navigation';
import {useCurrentScreen} from '@store/navigation_store';
import {renderWithIntl} from '@test/intl-test-helper';

import DisplayTheme from './display_theme';

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));
jest.mock('@context/theme', () => ({
    useTheme: jest.fn(),
    getDefaultThemeByAppearance: jest.fn(),
}));
jest.mock('@actions/remote/preference');
jest.mock('@hooks/navigate_back');
jest.mock('@store/navigation_store');

jest.mocked(useTheme).mockReturnValue(Preferences.THEMES.denim);
jest.mocked(getDefaultThemeByAppearance).mockReturnValue(Preferences.THEMES.denim);

const displayThemeOtherProps = {
    currentTeamId: '1',
    currentUserId: '1',
    themeAutoSwitch: false,
};

describe('DisplayTheme', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render with a few themes, denim selected', () => {
        renderWithIntl(
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

        expect(navigateBack).toHaveBeenCalledTimes(0);
    });

    it('should call navigateBack when Android back button is pressed', () => {
        jest.mocked(useCurrentScreen).mockImplementation(() => Screens.SETTINGS_DISPLAY_THEME);
        const androidBackButtonHandler = jest.spyOn(BackHandler, 'addEventListener');

        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'custom']}
                {...displayThemeOtherProps}
            />,
        );

        // simulate Android back button press
        androidBackButtonHandler.mock.calls[0][1]();

        expect(navigateBack).toHaveBeenCalledTimes(1);
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

    it('should render light and dark theme sections when auto-switch is enabled', () => {
        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
                themeAutoSwitch={true}
            />);

        expect(screen.getByTestId('theme_display_settings.auto_switch.toggle')).toBeTruthy();
        expect(screen.getByText('Light Theme')).toBeTruthy();
        expect(screen.getByText('Dark Theme')).toBeTruthy();
    });

    it('should hide light and dark sections and save preference when auto-switch is toggled off', async () => {
        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
                themeAutoSwitch={true}
            />);

        expect(screen.getByText('Light Theme')).toBeTruthy();
        expect(screen.getByText('Dark Theme')).toBeTruthy();

        const toggle = screen.getByTestId('theme_display_settings.auto_switch.toggle.toggled.true.button');
        fireEvent(toggle, 'valueChange', false);

        expect(screen.queryByText('Light Theme')).toBeNull();
        expect(screen.queryByText('Dark Theme')).toBeNull();

        await waitFor(() => {
            expect(savePreference).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.objectContaining({
                        category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                        name: Preferences.THEME_AUTO_SWITCH,
                        value: 'false',
                    }),
                ]),
            );
        });
    });

    it('should save light theme immediately when tapping a tile in auto-switch mode', async () => {
        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
                themeAutoSwitch={true}
            />,
        );

        // In auto-switch mode, each theme tile appears in both the Light and Dark sections
        const [lightSapphire] = screen.getAllByTestId('theme_display_settings.sapphire.option');
        fireEvent.press(lightSapphire);

        await waitFor(() => {
            expect(savePreference).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.objectContaining({
                        category: Preferences.CATEGORIES.THEME,
                        value: expect.stringContaining('"type":"Sapphire"'),
                    }),
                ]),
            );
        });
    });

    it('should save dark theme immediately when tapping a tile in auto-switch mode', async () => {
        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire', 'onyx']}
                {...displayThemeOtherProps}
                themeAutoSwitch={true}
            />,
        );

        // In auto-switch mode, each theme tile appears in both the Light and Dark sections
        const [, darkOnyx] = screen.getAllByTestId('theme_display_settings.onyx.option');
        fireEvent.press(darkOnyx);

        await waitFor(() => {
            expect(savePreference).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.objectContaining({
                        category: Preferences.CATEGORIES.THEME_DARK,
                        value: expect.stringContaining('"type":"Onyx"'),
                    }),
                ]),
            );
        });
    });

    it('should not seed the light custom theme from the active dark theme when auto-switch is on', () => {
        const customDark: Theme = {...Preferences.THEMES.onyx, type: 'custom', sidebarBg: '#ff0000'};
        jest.mocked(useTheme).mockReturnValue(customDark);

        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
                lightTheme={Preferences.THEMES.denim}
                darkTheme={customDark}
                themeAutoSwitch={true}
            />,
        );

        // Custom should only appear in the dark section, not leaked into light
        expect(screen.getAllByTestId('theme_display_settings.custom.option')).toHaveLength(1);
        expect(screen.getByTestId('theme_display_settings.denim.option.selected')).toBeTruthy();
    });

    it('should save the updated custom light theme after stored custom colors change', async () => {
        const customLight: Theme = {...Preferences.THEMES.denim, type: 'custom', sidebarBg: '#00ff00'};
        const updatedCustomLight: Theme = {...Preferences.THEMES.denim, type: 'custom', sidebarBg: '#0000ff'};

        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim']}
                {...displayThemeOtherProps}
                lightTheme={customLight}
                themeAutoSwitch={true}
            />,
        );

        screen.rerender(
            <DisplayTheme
                allowedThemeKeys={['denim']}
                {...displayThemeOtherProps}
                lightTheme={updatedCustomLight}
                themeAutoSwitch={true}
            />,
        );

        fireEvent.press(screen.getByTestId('theme_display_settings.custom.option'));

        await waitFor(() => {
            expect(savePreference).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.objectContaining({
                        category: Preferences.CATEGORIES.THEME,
                        value: expect.stringContaining('"sidebarBg":"#0000ff"'),
                    }),
                ]),
            );
        });
    });

    it('should save custom dark theme immediately when tapping custom tile in auto-switch mode', async () => {
        const customDark: Theme = {...Preferences.THEMES.onyx, type: 'custom', sidebarBg: '#ff0000'};

        renderWithIntl(
            <DisplayTheme
                allowedThemeKeys={['denim', 'sapphire']}
                {...displayThemeOtherProps}
                darkTheme={customDark}
                themeAutoSwitch={true}
            />,
        );

        // The custom dark tile is in the dark section
        const customTile = screen.getByTestId('theme_display_settings.custom.option');
        fireEvent.press(customTile);

        await waitFor(() => {
            expect(savePreference).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.objectContaining({
                        category: Preferences.CATEGORIES.THEME_DARK,
                        value: expect.stringContaining('"sidebarBg":"#ff0000"'),
                    }),
                ]),
            );
        });
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
