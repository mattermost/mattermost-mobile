// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import React from 'react';

import {
    getBottomSheetHeaderOptions,
    getHeaderOptions,
    getLoginFlowHeaderOptions,
    getLoginModalHeaderOptions,
    getModalHeaderOptions,
    useNavigationHeader,
} from './navigation_header';

const mockSetOptions = jest.fn();
const mockCanGoBack = jest.fn();
const mockNavigation = {
    setOptions: mockSetOptions,
};
const mockRouter = {
    canGoBack: mockCanGoBack,
};

jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => mockNavigation),
    useRouter: jest.fn(() => mockRouter),
}));

describe('navigation_header', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('useNavigationHeader', () => {
        it('should show header when pushed and showWhenPushed is true', () => {
            mockCanGoBack.mockReturnValue(true);

            const headerOptions = {
                title: 'Test Screen',
                headerBackTitle: 'Back',
            };

            renderHook(() => useNavigationHeader({
                showWhenPushed: true,
                showWhenRoot: false,
                headerOptions,
            }));

            expect(mockSetOptions).toHaveBeenCalledWith({
                headerShown: true,
                title: 'Test Screen',
                headerBackTitle: 'Back',
            });
        });

        it('should hide header when pushed and showWhenPushed is false', () => {
            mockCanGoBack.mockReturnValue(true);

            renderHook(() => useNavigationHeader({
                showWhenPushed: false,
                showWhenRoot: true,
            }));

            expect(mockSetOptions).toHaveBeenCalledWith({
                headerShown: false,
            });
        });

        it('should show header when root and showWhenRoot is true', () => {
            mockCanGoBack.mockReturnValue(false);

            const headerOptions = {
                title: 'Root Screen',
            };

            renderHook(() => useNavigationHeader({
                showWhenPushed: false,
                showWhenRoot: true,
                headerOptions,
            }));

            expect(mockSetOptions).toHaveBeenCalledWith({
                headerShown: true,
                title: 'Root Screen',
            });
        });

        it('should hide header when root and showWhenRoot is false', () => {
            mockCanGoBack.mockReturnValue(false);

            renderHook(() => useNavigationHeader({
                showWhenPushed: true,
                showWhenRoot: false,
            }));

            expect(mockSetOptions).toHaveBeenCalledWith({
                headerShown: false,
            });
        });

        it('should default to false when showWhenPushed is undefined', () => {
            mockCanGoBack.mockReturnValue(true);

            renderHook(() => useNavigationHeader({
                showWhenRoot: true,
            }));

            expect(mockSetOptions).toHaveBeenCalledWith({
                headerShown: false,
            });
        });

        it('should default to false when showWhenRoot is undefined', () => {
            mockCanGoBack.mockReturnValue(false);

            renderHook(() => useNavigationHeader({
                showWhenPushed: true,
            }));

            expect(mockSetOptions).toHaveBeenCalledWith({
                headerShown: false,
            });
        });

        it('should set presentation option when provided', () => {
            mockCanGoBack.mockReturnValue(false);

            renderHook(() => useNavigationHeader({
                showWhenRoot: true,
                presentation: 'modal',
            }));

            expect(mockSetOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    presentation: 'modal',
                }),
            );
        });

        it('should set gestureEnabled option when provided as true', () => {
            mockCanGoBack.mockReturnValue(false);

            renderHook(() => useNavigationHeader({
                showWhenRoot: true,
                gestureEnabled: true,
            }));

            expect(mockSetOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    gestureEnabled: true,
                }),
            );
        });

        it('should set gestureEnabled option when provided as false', () => {
            mockCanGoBack.mockReturnValue(false);

            renderHook(() => useNavigationHeader({
                showWhenRoot: true,
                gestureEnabled: false,
            }));

            expect(mockSetOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    gestureEnabled: false,
                }),
            );
        });

        it('should not set gestureEnabled when undefined', () => {
            mockCanGoBack.mockReturnValue(false);

            renderHook(() => useNavigationHeader({
                showWhenRoot: true,
            }));

            const callArg = mockSetOptions.mock.calls[0][0];
            expect(callArg).not.toHaveProperty('gestureEnabled');
        });

        it('should set animation option when provided', () => {
            mockCanGoBack.mockReturnValue(false);

            renderHook(() => useNavigationHeader({
                showWhenRoot: true,
                animation: 'slide_from_bottom',
            }));

            expect(mockSetOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    animation: 'slide_from_bottom',
                }),
            );
        });

        it('should not set animation when undefined', () => {
            mockCanGoBack.mockReturnValue(false);

            renderHook(() => useNavigationHeader({
                showWhenRoot: true,
            }));

            const callArg = mockSetOptions.mock.calls[0][0];
            expect(callArg).not.toHaveProperty('animation');
        });

        it('should only include headerOptions when header is shown', () => {
            mockCanGoBack.mockReturnValue(false);

            const headerOptions = {
                title: 'Test',
                headerTintColor: '#000',
            };

            renderHook(() => useNavigationHeader({
                showWhenRoot: false,
                headerOptions,
            }));

            expect(mockSetOptions).toHaveBeenCalledWith({
                headerShown: false,
            });
        });

        it('should combine all options when header is shown', () => {
            mockCanGoBack.mockReturnValue(true);

            const headerOptions = {
                title: 'Test',
                headerBackTitle: 'Back',
            };

            renderHook(() => useNavigationHeader({
                showWhenPushed: true,
                headerOptions,
                presentation: 'modal',
                gestureEnabled: true,
                animation: 'slide_from_right',
            }));

            expect(mockSetOptions).toHaveBeenCalledWith({
                headerShown: true,
                title: 'Test',
                headerBackTitle: 'Back',
                presentation: 'modal',
                gestureEnabled: true,
                animation: 'slide_from_right',
            });
        });
    });

    describe('getLoginFlowHeaderOptions', () => {
        it('should return correct header options for login flow', () => {
            const theme = {
                centerChannelColor: '#ffffff',
                centerChannelBg: '#000000',
            } as Theme;

            const result = getLoginFlowHeaderOptions(theme);

            expect(result).toEqual({
                headerShown: true,
                headerTransparent: true,
                headerTitle: '',
                headerBackTitle: '',
                headerBackButtonDisplayMode: 'minimal',
                headerTintColor: '#ffffff',
                headerBackButtonMenuEnabled: false,
                headerBackVisible: true,
                contentStyle: {backgroundColor: '#000000'},
                headerStyle: {
                    backgroundColor: 'transparent',
                },
            });
        });
    });

    describe('getLoginModalHeaderOptions', () => {
        it('should return header options with close button when onClose is provided', () => {
            const theme = {
                centerChannelColor: '#ffffff',
                centerChannelBg: '#000000',
            } as Theme;
            const onClose = jest.fn();
            const testID = 'close-button';

            const result = getLoginModalHeaderOptions(theme, onClose, testID);

            expect(result.headerShown).toBe(true);
            expect(result.headerTransparent).toBe(true);
            expect(result.headerTitle).toBe('');
            expect(result.contentStyle).toEqual({backgroundColor: '#000000'});
            expect(result.headerStyle).toEqual({backgroundColor: 'transparent'});
            expect(result.headerLeft).toBeDefined();
            expect(typeof result.headerLeft).toBe('function');
        });

        it('should render NavigationButton when headerLeft is called', () => {
            const theme = {
                centerChannelColor: '#ffffff',
                centerChannelBg: '#000000',
            } as Theme;
            const onClose = jest.fn();
            const testID = 'close-button';

            const result = getLoginModalHeaderOptions(theme, onClose, testID);

            const HeaderLeftComponent = result.headerLeft as () => React.ReactElement;
            // eslint-disable-next-line new-cap
            const element = HeaderLeftComponent();

            expect(element).toBeDefined();
            expect((element.type as any).name).toBe('NavigationButton');
            expect(element.props.onPress).toBe(onClose);
            expect(element.props.iconName).toBe('close');
            expect(element.props.iconSize).toBe(24);
            expect(element.props.color).toBe('#ffffff');
            expect(element.props.testID).toBe(testID);
        });

        it('should return header options without close button when onClose is not provided', () => {
            const theme = {
                centerChannelColor: '#ffffff',
                centerChannelBg: '#000000',
            } as Theme;

            const result = getLoginModalHeaderOptions(theme);

            expect(result.headerShown).toBe(true);
            expect(result.headerLeft).toBeUndefined();
        });

        it('should return header options without testID when not provided', () => {
            const theme = {
                centerChannelColor: '#ffffff',
                centerChannelBg: '#000000',
            } as Theme;
            const onClose = jest.fn();

            const result = getLoginModalHeaderOptions(theme, onClose);

            const HeaderLeftComponent = result.headerLeft as () => React.ReactElement;
            // eslint-disable-next-line new-cap
            const element = HeaderLeftComponent();

            expect(element.props.testID).toBeUndefined();
        });
    });

    describe('getHeaderOptions', () => {
        it('should return correct header options', () => {
            const theme = {
                centerChannelBg: '#ffffff',
                sidebarBg: '#1c1c1e',
                sidebarHeaderTextColor: '#ffffff',
            } as Theme;

            const result = getHeaderOptions(theme);

            expect(result.headerShown).toBe(true);
            expect(result.animation).toBe('default');
            expect(result.presentation).toBe('card');
            expect(result.contentStyle).toEqual({backgroundColor: '#ffffff'});
            expect(result.headerStyle).toEqual({backgroundColor: '#1c1c1e'});
            expect(result.headerTitleStyle).toBeDefined();
            expect(result.headerTintColor).toBe('#ffffff');
            expect(result.headerBackButtonDisplayMode).toBe('minimal');
            expect(result.headerBackVisible).toBe(true);
        });

        it('should include typography in headerTitleStyle', () => {
            const theme = {
                centerChannelBg: '#ffffff',
                sidebarBg: '#1c1c1e',
                sidebarHeaderTextColor: '#ffffff',
            } as Theme;

            const result = getHeaderOptions(theme);

            expect(result.headerTitleStyle).toHaveProperty('fontFamily');
            expect(result.headerTitleStyle).toHaveProperty('fontSize');
            expect(result.headerTitleStyle).toHaveProperty('fontWeight');
            expect(result.headerTitleStyle).toHaveProperty('color', '#ffffff');
        });
    });

    describe('getModalHeaderOptions', () => {
        it('should return correct modal header options', () => {
            const theme = {
                centerChannelBg: '#ffffff',
                sidebarBg: '#1c1c1e',
                sidebarHeaderTextColor: '#ffffff',
            } as Theme;
            const onClose = jest.fn();
            const testID = 'modal-close';

            const result = getModalHeaderOptions(theme, onClose, testID);

            expect(result.headerShown).toBe(true);
            expect(result.animation).toBe('slide_from_bottom');
            expect(result.presentation).toBe('modal');
            expect(result.contentStyle).toEqual({backgroundColor: '#ffffff'});
            expect(result.headerStyle).toEqual({backgroundColor: '#1c1c1e'});
            expect(result.headerTitleStyle).toBeDefined();
            expect(result.headerLeft).toBeDefined();
            expect(typeof result.headerLeft).toBe('function');
        });

        it('should render NavigationButton wrapped in View with Android margin', () => {
            const theme = {
                centerChannelBg: '#ffffff',
                sidebarBg: '#1c1c1e',
                sidebarHeaderTextColor: '#ffffff',
            } as Theme;
            const onClose = jest.fn();
            const testID = 'modal-close';

            const result = getModalHeaderOptions(theme, onClose, testID);

            const HeaderLeftComponent = result.headerLeft as () => React.ReactElement;
            // eslint-disable-next-line new-cap
            const element = HeaderLeftComponent();

            expect(element).toBeDefined();

            // The root element is View
            expect((element.type as any).displayName).toBe('View');

            // The NavigationButton inside View
            const buttonElement = element.props.children;
            expect((buttonElement.type as any).name).toBe('NavigationButton');
            expect(buttonElement.props.onPress).toBe(onClose);
            expect(buttonElement.props.iconName).toBe('close');
            expect(buttonElement.props.iconSize).toBe(24);
            expect(buttonElement.props.testID).toBe(testID);
        });

        it('should work without testID', () => {
            const theme = {
                centerChannelBg: '#ffffff',
                sidebarBg: '#1c1c1e',
                sidebarHeaderTextColor: '#ffffff',
            } as Theme;
            const onClose = jest.fn();

            const result = getModalHeaderOptions(theme, onClose);

            const HeaderLeftComponent = result.headerLeft as () => React.ReactElement;
            // eslint-disable-next-line new-cap
            const element = HeaderLeftComponent();

            const buttonElement = element.props.children;
            expect(buttonElement.props.testID).toBeUndefined();
        });
    });

    describe('getBottomSheetHeaderOptions', () => {
        it('should return correct bottom sheet header options', () => {
            const result = getBottomSheetHeaderOptions();

            expect(result).toEqual({
                headerShown: false,
                animation: 'none',
                presentation: 'transparentModal',
                contentStyle: {backgroundColor: 'transparent'},
            });
        });
    });
});
