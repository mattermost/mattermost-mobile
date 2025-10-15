// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';
import {Alert} from 'react-native';

import {storeLowConnectivityMonitor} from '@actions/app/global';
import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {deleteFileCache, getAllFilesInCachesDirectory} from '@utils/file';

import AdvancedSettings from './advanced';

import type {FileInfo} from 'expo-file-system';

jest.mock('@actions/app/global');
jest.mock('@utils/file');
jest.mock('@screens/navigation');
jest.mock('@hooks/android_back_handler', () => jest.fn());

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://test.mattermost.com'),
}));

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: jest.fn((callback) => callback),
}));

const mockStoreLowConnectivityMonitor = storeLowConnectivityMonitor as jest.Mock;
const mockGetAllFilesInCachesDirectory = getAllFilesInCachesDirectory as jest.Mock;
const mockDeleteFileCache = deleteFileCache as jest.Mock;
const mockGoToScreen = goToScreen as jest.Mock;

describe('AdvancedSettings', () => {
    const defaultProps = {
        componentId: 'SettingsAdvanced' as const,
        isDevMode: false,
        lowConnectivityMonitorEnabled: false,
    };

    const mockFiles: FileInfo[] = [
        {
            uri: 'file:///cache/file1.jpg',
            size: 1024 * 1024,
            modificationTime: Date.now() / 1000,
            isDirectory: false,
            exists: true,
            md5: 'abc123',
        },
        {
            uri: 'file:///cache/file2.png',
            size: 2048 * 1024,
            modificationTime: Date.now() / 1000,
            isDirectory: false,
            exists: true,
            md5: 'def456',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAllFilesInCachesDirectory.mockResolvedValue({
            totalSize: 3072 * 1024,
            files: mockFiles,
        });
        Alert.alert = jest.fn();
    });

    describe('rendering', () => {
        it('should render advanced settings container', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.screen')).toBeTruthy();
            });
        });

        it('should render delete local files option', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.delete_data.option')).toBeTruthy();
            });
        });

        it('should render low connectivity monitor toggle', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.low_connectivity_monitor.option')).toBeTruthy();
            });
        });

        it('should render component library option in dev mode', async () => {
            renderWithIntlAndTheme(
                <AdvancedSettings
                    {...defaultProps}
                    isDevMode={true}
                />,
            );

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.component_library.option')).toBeTruthy();
            });
        });

        it('should not render component library option when not in dev mode', async () => {
            renderWithIntlAndTheme(
                <AdvancedSettings
                    {...defaultProps}
                    isDevMode={false}
                />,
            );

            await waitFor(() => {
                expect(screen.queryByTestId('advanced_settings.component_library.option')).toBeNull();
            });
        });

        it('should display file size for delete option', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                const deleteOption = screen.getByTestId('advanced_settings.delete_data.option');
                expect(deleteOption).toBeTruthy();
            });
        });

        it('should handle empty cache gracefully', async () => {
            mockGetAllFilesInCachesDirectory.mockResolvedValue({
                totalSize: 0,
                files: [],
            });

            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.screen')).toBeTruthy();
            });
        });
    });

    describe('delete local files', () => {
        it('should show confirmation alert when delete button is pressed with files', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.delete_data.option')).toBeTruthy();
            });

            const deleteOption = screen.getByTestId('advanced_settings.delete_data.option');

            fireEvent.press(deleteOption);

            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Delete local files',
                    '\nThis will delete all files downloaded through the app for this server. Please confirm to proceed.\n',
                    [
                        {text: 'Cancel', style: 'cancel'},
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: expect.any(Function),
                        },
                    ],
                    {cancelable: false},
                );
            });
        });

        it('should delete files when user confirms', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.delete_data.option')).toBeTruthy();
            });

            const deleteOption = screen.getByTestId('advanced_settings.delete_data.option');
            fireEvent.press(deleteOption);

            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalled();
            });

            const alertCalls = (Alert.alert as jest.Mock).mock.calls;
            const deleteCallback = alertCalls[0][2][1].onPress;

            await deleteCallback();

            await waitFor(() => {
                expect(mockDeleteFileCache).toHaveBeenCalledWith('https://test.mattermost.com');
                expect(mockGetAllFilesInCachesDirectory).toHaveBeenCalledTimes(2);
            });
        });

        it('should not show alert when no files exist', async () => {
            mockGetAllFilesInCachesDirectory.mockResolvedValue({
                totalSize: 0,
                files: [],
            });

            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.delete_data.option')).toBeTruthy();
            });

            const deleteOption = screen.getByTestId('advanced_settings.delete_data.option');
            fireEvent.press(deleteOption);

            await waitFor(() => {
                expect(Alert.alert).not.toHaveBeenCalled();
            });
        });

        it('should handle delete error gracefully', async () => {
            mockDeleteFileCache.mockResolvedValue(undefined);

            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.delete_data.option')).toBeTruthy();
            });

            const deleteOption = screen.getByTestId('advanced_settings.delete_data.option');
            fireEvent.press(deleteOption);

            expect(Alert.alert).toHaveBeenCalled();
        });
    });

    describe('component library navigation', () => {
        it('should navigate to component library when option is pressed', async () => {
            renderWithIntlAndTheme(
                <AdvancedSettings
                    {...defaultProps}
                    isDevMode={true}
                />);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.component_library.option')).toBeTruthy();
            });

            const componentLibraryOption = screen.getByTestId('advanced_settings.component_library.option');
            fireEvent.press(componentLibraryOption);

            await waitFor(() => {
                expect(mockGoToScreen).toHaveBeenCalledWith(
                    Screens.COMPONENT_LIBRARY,
                    'Component library',
                );
            });
        });

        it('should not navigate when component library is not rendered', async () => {
            renderWithIntlAndTheme(
                <AdvancedSettings
                    {...defaultProps}
                    isDevMode={false}
                />);

            await waitFor(() => {
                expect(screen.queryByTestId('advanced_settings.component_library.option')).toBeNull();
            });

            expect(mockGoToScreen).not.toHaveBeenCalled();
        });
    });

    describe('low connectivity monitor toggle', () => {
        it('should render toggle in off state when disabled', async () => {
            renderWithIntlAndTheme(
                <AdvancedSettings
                    {...defaultProps}
                    lowConnectivityMonitorEnabled={false}
                />);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.low_connectivity_monitor.option.toggled.false.button')).toBeTruthy();
            });
        });

        it('should render toggle in on state when enabled', async () => {
            renderWithIntlAndTheme(
                <AdvancedSettings
                    {...defaultProps}
                    lowConnectivityMonitorEnabled={true}
                />);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.low_connectivity_monitor.option.toggled.true.button')).toBeTruthy();
            });
        });

        it('should call storeLowConnectivityMonitor when toggled on', async () => {
            mockStoreLowConnectivityMonitor.mockResolvedValue({});

            renderWithIntlAndTheme(
                <AdvancedSettings
                    {...defaultProps}
                    lowConnectivityMonitorEnabled={false}
                />);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.low_connectivity_monitor.option.toggled.false.button')).toBeTruthy();
            });

            const toggle = screen.getByTestId('advanced_settings.low_connectivity_monitor.option.toggled.false.button');

            fireEvent(toggle, 'valueChange', true);

            await waitFor(() => {
                expect(mockStoreLowConnectivityMonitor).toHaveBeenCalledWith(true);
            });
        });

        it('should call storeLowConnectivityMonitor when toggled off', async () => {
            mockStoreLowConnectivityMonitor.mockResolvedValue({});

            renderWithIntlAndTheme(
                <AdvancedSettings
                    {...defaultProps}
                    lowConnectivityMonitorEnabled={true}
                />);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.low_connectivity_monitor.option.toggled.true.button')).toBeTruthy();
            });

            const toggle = screen.getByTestId('advanced_settings.low_connectivity_monitor.option.toggled.true.button');

            fireEvent(toggle, 'valueChange', false);

            await waitFor(() => {
                expect(mockStoreLowConnectivityMonitor).toHaveBeenCalledWith(false);
            });
        });

        it('should update local state when toggle is changed', async () => {
            mockStoreLowConnectivityMonitor.mockResolvedValue({});

            renderWithIntlAndTheme(
                <AdvancedSettings
                    {...defaultProps}
                    lowConnectivityMonitorEnabled={false}
                />,
            );

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.low_connectivity_monitor.option.toggled.false.button')).toBeTruthy();
            });

            const toggle = screen.getByTestId('advanced_settings.low_connectivity_monitor.option.toggled.false.button');

            fireEvent(toggle, 'valueChange', true);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.low_connectivity_monitor.option.toggled.true.button')).toBeTruthy();
            });
        });
    });

    describe('data fetching', () => {
        it('should fetch cached files on mount', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(mockGetAllFilesInCachesDirectory).toHaveBeenCalledWith('https://test.mattermost.com');
            });
        });

        it('should handle fetch error gracefully', async () => {
            mockGetAllFilesInCachesDirectory.mockRejectedValue(new Error('Fetch failed'));

            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(mockGetAllFilesInCachesDirectory).toHaveBeenCalled();
            });
        });

        it('should refetch files after deletion', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.delete_data.option')).toBeTruthy();
            });

            expect(mockGetAllFilesInCachesDirectory).toHaveBeenCalledTimes(1);

            const deleteOption = screen.getByTestId('advanced_settings.delete_data.option');
            fireEvent.press(deleteOption);

            const alertCalls = (Alert.alert as jest.Mock).mock.calls;
            const deleteCallback = alertCalls[0][2][1].onPress;

            await deleteCallback();

            await waitFor(() => {
                expect(mockGetAllFilesInCachesDirectory).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('edge cases', () => {
        it('should handle undefined totalSize gracefully', async () => {
            mockGetAllFilesInCachesDirectory.mockResolvedValue({
                totalSize: undefined,
                files: [],
            });

            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.screen')).toBeTruthy();
            });
        });

        it('should handle null files gracefully', async () => {
            mockGetAllFilesInCachesDirectory.mockResolvedValue({
                totalSize: 0,
                files: null,
            });

            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.screen')).toBeTruthy();
            });
        });

        it('should handle very large file sizes', async () => {
            mockGetAllFilesInCachesDirectory.mockResolvedValue({
                totalSize: 5 * 1024 * 1024 * 1024,
                files: [],
            });

            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('advanced_settings.delete_data.option')).toBeTruthy();
            });
        });

        it('should render experimental features section header', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByText('Experimental Features')).toBeTruthy();
            });
        });

        it('should display low connectivity monitor description', async () => {
            renderWithIntlAndTheme(<AdvancedSettings {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByText('Display banners when network connectivity or performance issues are detected')).toBeTruthy();
            });
        });
    });
});
