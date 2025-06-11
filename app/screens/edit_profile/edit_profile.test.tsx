// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {act} from '@testing-library/react-hooks';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';

import AvailableScreens from '@constants/screens';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import EditProfile from './edit_profile';

import type {UserModel} from '@database/models/server';
import type {CustomAttributeSet} from '@typings/api/custom_profile_attributes';

// Create server and database attribute sets for testing
const serverAttributesSet: CustomAttributeSet = {
    attr1: {
        id: 'attr1',
        name: 'Custom Attribute 1',
        value: 'server value 1',
        sort_order: 1,
        type: 'text',
    },
    attr2: {
        id: 'attr2',
        name: 'Custom Attribute 2',
        value: 'server value 2',
        sort_order: 2,
        type: 'text',
    },
    attr3: {
        id: 'attr3',
        name: 'Custom Attribute 3',
        value: 'server value 3',
        sort_order: 3,
        type: 'text',
    },
};

const dbAttributesSet: CustomAttributeSet = {
    attr1: {
        id: 'attr1',
        name: 'Custom Attribute 1',
        value: 'db value 1',
        sort_order: 1,
        type: 'text',
    },
    attr2: {
        id: 'attr2',
        name: 'Custom Attribute 2',
        value: 'db value 2',
        sort_order: 2,
        type: 'text',
    },
};

jest.mock('@components/compass_icon', () => {
    function CompassIcon() {
        return null;
    }
    CompassIcon.getImageSourceSync = jest.fn().mockReturnValue({});
    return {
        __esModule: true,
        default: CompassIcon,
    };
});

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue('http://localhost:8065'),
}));

// Mock for custom profile attributes API
const mockFetchCustomProfileAttributes = jest.fn();

// Add mock for updateCustomProfileAttributes to track calls
const mockUpdateCustomProfileAttributes = jest.fn();

// Mock logError function
const mockLogError = jest.fn();

jest.mock('@actions/remote/custom_profile', () => ({
    fetchCustomProfileAttributes: (...args: any[]) => mockFetchCustomProfileAttributes(...args),
    updateCustomProfileAttributes: (...args: any[]) => mockUpdateCustomProfileAttributes(...args),
}));

jest.mock('@utils/log', () => ({
    logError: (...args: any[]) => mockLogError(...args),
}));

jest.mock('@actions/remote/user', () => ({
    updateMe: jest.fn().mockResolvedValue({error: undefined}),
    uploadUserProfileImage: jest.fn().mockResolvedValue({error: undefined}),
    setDefaultProfileImage: jest.fn().mockResolvedValue({}),
    buildProfileImageUrlFromUser: jest.fn().mockReturnValue('http://example.com/profile.jpg'),
}));

// Mock WatermelonDB functionality
jest.mock('@database/manager', () => {
    const databaseMock = {
        get: jest.fn().mockReturnValue({
            query: jest.fn().mockReturnValue({
                fetch: jest.fn().mockResolvedValue([]),
            }),
        }),
    };

    return {
        getServerDatabaseAndOperator: jest.fn().mockReturnValue({
            database: databaseMock,
            operator: {
                handleCustomProfileAttributes: jest.fn().mockResolvedValue({}),
                handleCustomProfileFields: jest.fn().mockResolvedValue({}),
            },
        }),
    };
});

jest.mock('@queries/servers/custom_profile', () => {
    const mockSubscribeFunction = jest.fn().mockImplementation((callback) => {
        // Simulate an immediate callback with empty data
        setTimeout(() => callback([]), 0);
        return {
            unsubscribe: jest.fn(),
        };
    });

    const mockObservable = {
        subscribe: mockSubscribeFunction,
    };

    return {
        observeCustomProfileAttributesByUserId: jest.fn().mockReturnValue(mockObservable),
        observeCustomProfileFields: jest.fn().mockReturnValue(mockObservable),
        queryCustomProfileAttributesByUserId: jest.fn().mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
        }),
        convertProfileAttributesToCustomAttributes: jest.fn().mockResolvedValue([
            {
                id: 'attr1',
                name: 'Custom Attribute 1',
                value: 'db value 1',
                sort_order: 1,
            },
            {
                id: 'attr2',
                name: 'Custom Attribute 2',
                value: 'db value 2',
                sort_order: 2,
            },
        ]),
    };
});

describe('EditProfile', () => {
    const mockCurrentUser = {
        id: 'user1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        nickname: 'Johnny',
        position: 'Developer',
        username: 'johndoe',
    } as UserModel;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset the mock to its default success response
        mockFetchCustomProfileAttributes.mockImplementation(() => Promise.resolve({
            attributes: serverAttributesSet,
            error: undefined,
        }));

        // Reset updateCustomProfileAttributes mock
        mockUpdateCustomProfileAttributes.mockResolvedValue({success: true, error: undefined});

        // Reset logError mock
        mockLogError.mockClear();
    });

    it('should update custom attribute value while preserving name and sort order', async () => {
        const {findAllByTestId} = renderWithIntlAndTheme(
            <EditProfile
                componentId={AvailableScreens.EDIT_PROFILE}
                currentUser={mockCurrentUser}
                isModal={false}
                isTablet={false}
                lockedFirstName={false}
                lockedLastName={false}
                lockedNickname={false}
                lockedPosition={false}
                lockedPicture={false}
                enableCustomAttributes={true}
                customFields={[]}
                customAttributesSet={serverAttributesSet}
            />,
        );

        const customAttributeItems = await findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
        expect(customAttributeItems.length).toBe(3);

        expect(customAttributeItems[0].props.value).toBe('server value 1');
        expect(customAttributeItems[1].props.value).toBe('server value 2');
        expect(customAttributeItems[2].props.value).toBe('server value 3');

        await act(async () => {
            fireEvent.changeText(customAttributeItems[1], 'new value');
        });

        const newCustomAttributeItems = await findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
        expect(newCustomAttributeItems.length).toBe(3);
        expect(newCustomAttributeItems[0].props.value).toBe('server value 1');
        expect(newCustomAttributeItems[1].props.value).toBe('new value');
        expect(newCustomAttributeItems[2].props.value).toBe('server value 3');
    });

    it('should load custom attributes from database before fetching from server', async () => {
        // Mock server fetch to return an error so database values remain
        mockFetchCustomProfileAttributes.mockReset();
        mockFetchCustomProfileAttributes.mockImplementation(() => {
            // Return a failed fetch
            return Promise.resolve({
                attributes: null,
                error: new Error('Server fetch failed'),
            });
        });

        // Setup component with database values from customAttributesSet prop
        const {findAllByTestId, rerender} = renderWithIntlAndTheme(
            <EditProfile
                componentId={AvailableScreens.EDIT_PROFILE}
                currentUser={mockCurrentUser}
                isModal={false}
                isTablet={false}
                lockedFirstName={false}
                lockedLastName={false}
                lockedNickname={false}
                lockedPosition={false}
                lockedPicture={false}
                enableCustomAttributes={true}
                customFields={[]}
                customAttributesSet={dbAttributesSet}
            />,
        );

        // Wait for component to mount and useEffect to run
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        // Verify database values are shown
        const initialAttributeItems = await findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
        expect(initialAttributeItems.length).toBe(2);
        expect(initialAttributeItems[0].props.value).toBe('db value 1');
        expect(initialAttributeItems[1].props.value).toBe('db value 2');

        // Verify fetch was called with user1
        expect(mockFetchCustomProfileAttributes).toHaveBeenCalledWith('http://localhost:8065', 'user1');

        // Now reset the mock to return success and simulate server fetch completing
        mockFetchCustomProfileAttributes.mockReset();
        mockFetchCustomProfileAttributes.mockImplementation(() => Promise.resolve({
            attributes: serverAttributesSet,
            error: undefined,
        }));

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Rerender with server values
            rerender(
                <EditProfile
                    componentId={AvailableScreens.EDIT_PROFILE}
                    currentUser={mockCurrentUser}
                    isModal={false}
                    isTablet={false}
                    lockedFirstName={false}
                    lockedLastName={false}
                    lockedNickname={false}
                    lockedPosition={false}
                    lockedPicture={false}
                    enableCustomAttributes={true}
                    customFields={[]}
                    customAttributesSet={serverAttributesSet}
                />,
            );
        });

        // Verify server values update the UI
        const serverAttributeItems = await findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
        expect(serverAttributeItems.length).toBe(3);
        expect(serverAttributeItems[0].props.value).toBe('server value 1');
        expect(serverAttributeItems[1].props.value).toBe('server value 2');
        expect(serverAttributeItems[2].props.value).toBe('server value 3');
    });

    it('should update UI when database data changes via observables', async () => {
        // Mock server fetch to return an error so it doesn't affect the test
        mockFetchCustomProfileAttributes.mockReset();
        mockFetchCustomProfileAttributes.mockImplementation(() => {
            return Promise.resolve({
                attributes: null,
                error: new Error('Server fetch disabled for this test'),
            });
        });

        // Setup component with empty attributes initially
        const {findAllByTestId, queryAllByTestId, rerender} = renderWithIntlAndTheme(
            <EditProfile
                componentId={AvailableScreens.EDIT_PROFILE}
                currentUser={mockCurrentUser}
                isModal={false}
                isTablet={false}
                lockedFirstName={false}
                lockedLastName={false}
                lockedNickname={false}
                lockedPosition={false}
                lockedPicture={false}
                enableCustomAttributes={true}
                customFields={[]}
                customAttributesSet={{}}
            />,
        );

        // Initially there should be no custom attributes (using queryAllByTestId which doesn't throw)
        const initialItems = queryAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
        expect(initialItems.length).toBe(0);

        // Simulate database update by changing props
        await act(async () => {
            rerender(
                <EditProfile
                    componentId={AvailableScreens.EDIT_PROFILE}
                    currentUser={mockCurrentUser}
                    isModal={false}
                    isTablet={false}
                    lockedFirstName={false}
                    lockedLastName={false}
                    lockedNickname={false}
                    lockedPosition={false}
                    lockedPicture={false}
                    enableCustomAttributes={true}
                    customFields={[]}
                    customAttributesSet={dbAttributesSet}
                />,
            );
        });

        // Verify UI updated with database values
        const dbAttributeItems = await findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
        expect(dbAttributeItems.length).toBe(2);
        expect(dbAttributeItems[0].props.value).toBe('db value 1');
        expect(dbAttributeItems[1].props.value).toBe('db value 2');

        // Simulate a new database update
        const updatedDbAttributesSet: CustomAttributeSet = {
            attr1: {
                id: 'attr1',
                name: 'Custom Attribute 1',
                value: 'updated db value 1',
                sort_order: 1,
                type: 'text',
            },
            attr2: {
                id: 'attr2',
                name: 'Custom Attribute 2',
                value: 'updated db value 2',
                sort_order: 2,
                type: 'text',
            },
            attr4: {
                id: 'attr4',
                name: 'New Attribute',
                value: 'new db value',
                sort_order: 4,
                type: 'text',
            },
        };

        await act(async () => {
            rerender(
                <EditProfile
                    componentId={AvailableScreens.EDIT_PROFILE}
                    currentUser={mockCurrentUser}
                    isModal={false}
                    isTablet={false}
                    lockedFirstName={false}
                    lockedLastName={false}
                    lockedNickname={false}
                    lockedPosition={false}
                    lockedPicture={false}
                    enableCustomAttributes={true}
                    customFields={[]}
                    customAttributesSet={updatedDbAttributesSet}
                />,
            );
        });

        // Verify UI updated with new database values
        const updatedAttributeItems = await findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
        expect(updatedAttributeItems.length).toBe(3);
        expect(updatedAttributeItems[0].props.value).toBe('updated db value 1');
        expect(updatedAttributeItems[1].props.value).toBe('updated db value 2');

        // Check for the new attribute that was added
        const newAttributeItem = await findAllByTestId('edit_profile_form.customAttributes.attr4.input');
        expect(newAttributeItem[0].props.value).toBe('new db value');
    });

    describe('Submission Logic', () => {
        it('should update custom attributes when enableCustomAttributes is true and customAttributes exist', async () => {
            renderWithIntlAndTheme(
                <EditProfile
                    componentId={AvailableScreens.EDIT_PROFILE}
                    currentUser={mockCurrentUser}
                    isModal={false}
                    isTablet={true}
                    lockedFirstName={false}
                    lockedLastName={false}
                    lockedNickname={false}
                    lockedPosition={false}
                    lockedPicture={false}
                    enableCustomAttributes={true}
                    customFields={[]}
                    customAttributesSet={serverAttributesSet}
                />,
            );

            // Wait for component to load and custom attributes to be fetched
            await waitFor(async() => {
                const customAttributeItems = await screen.findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
                expect(customAttributeItems.length).toBeGreaterThan(0);
            });

            // Modify a field to trigger the hasUpdateUserInfo flag
            await act(async () => {
                const customAttributeItems = await screen.findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
                fireEvent.changeText(customAttributeItems[0], 'modified value');
            });

            // Trigger form submission
            const saveButton = screen.getByTestId('edit_profile.save.button');
            await act(async () => {
                fireEvent.press(saveButton);
            });

            // Verify that updateCustomProfileAttributes was called
            expect(mockUpdateCustomProfileAttributes).toHaveBeenCalledWith(
                'http://localhost:8065',
                'user1',
                expect.objectContaining({
                    attr1: expect.objectContaining({
                        value: 'modified value',
                    }),
                }),
            );
        });

        it('should not update custom attributes when enableCustomAttributes is false', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <EditProfile
                    componentId={AvailableScreens.EDIT_PROFILE}
                    currentUser={mockCurrentUser}
                    isModal={false}
                    isTablet={true}
                    lockedFirstName={false}
                    lockedLastName={false}
                    lockedNickname={false}
                    lockedPosition={false}
                    lockedPicture={false}
                    enableCustomAttributes={false}
                    customFields={[]}
                    customAttributesSet={serverAttributesSet}
                />,
            );

            // Wait for component to load
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
            });

            // Modify a standard field to trigger the hasUpdateUserInfo flag
            const firstNameField = getByTestId('edit_profile_form.firstName.input');
            await act(async () => {
                fireEvent.changeText(firstNameField, 'Modified John');
            });

            // Trigger form submission
            const saveButton = getByTestId('edit_profile.save.button');
            await act(async () => {
                fireEvent.press(saveButton);
            });

            // Verify that updateCustomProfileAttributes was NOT called
            expect(mockUpdateCustomProfileAttributes).not.toHaveBeenCalled();
        });

        it('should call updateCustomProfileAttributes with empty object when customAttributes is empty', async () => {
            // Mock server fetch to return empty attributes for this test
            mockFetchCustomProfileAttributes.mockResolvedValue({
                attributes: {},
                error: undefined,
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <EditProfile
                    componentId={AvailableScreens.EDIT_PROFILE}
                    currentUser={mockCurrentUser}
                    isModal={false}
                    isTablet={true}
                    lockedFirstName={false}
                    lockedLastName={false}
                    lockedNickname={false}
                    lockedPosition={false}
                    lockedPicture={false}
                    enableCustomAttributes={true}
                    customFields={[]}
                    customAttributesSet={{}}
                />,
            );

            // Wait for component to load
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
            });

            // Modify a standard field to trigger the hasUpdateUserInfo flag
            const firstNameField = getByTestId('edit_profile_form.firstName.input');
            await act(async () => {
                fireEvent.changeText(firstNameField, 'Modified John');
            });

            // Trigger form submission
            const saveButton = getByTestId('edit_profile.save.button');
            await act(async () => {
                fireEvent.press(saveButton);
            });

            // Verify that updateCustomProfileAttributes was called with empty object
            expect(mockUpdateCustomProfileAttributes).toHaveBeenCalledWith(
                'http://localhost:8065',
                'user1',
                {},
            );
        });

        it('should handle custom attributes update error gracefully', async () => {
            // Mock updateCustomProfileAttributes to return an error
            mockUpdateCustomProfileAttributes.mockResolvedValue({
                success: false,
                error: new Error('Failed to update custom attributes'),
            });

            renderWithIntlAndTheme(
                <EditProfile
                    componentId={AvailableScreens.EDIT_PROFILE}
                    currentUser={mockCurrentUser}
                    isModal={false}
                    isTablet={true}
                    lockedFirstName={false}
                    lockedLastName={false}
                    lockedNickname={false}
                    lockedPosition={false}
                    lockedPicture={false}
                    enableCustomAttributes={true}
                    customFields={[]}
                    customAttributesSet={serverAttributesSet}
                />,
            );

            // Wait for component to load and custom attributes to be fetched
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
            });

            // Modify a custom attribute to trigger the hasUpdateUserInfo flag
            const customAttributeItems = await screen.findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
            await act(async () => {
                fireEvent.changeText(customAttributeItems[0], 'modified value that will error');
            });

            // Trigger form submission
            const saveButton = screen.getByTestId('edit_profile.save.button');
            await act(async () => {
                fireEvent.press(saveButton);
            });

            // Verify that updateCustomProfileAttributes was called
            expect(mockUpdateCustomProfileAttributes).toHaveBeenCalled();

            // Verify error handling - check that error is logged
            await waitFor(() => {
                expect(mockLogError).toHaveBeenCalledWith(
                    'Error updating custom attributes',
                    expect.objectContaining({
                        message: 'Failed to update custom attributes',
                    }),
                );
            });
        });
    });

    it('should pass customFields prop to ProfileForm component', async () => {
        renderWithIntlAndTheme(
            <EditProfile
                componentId={AvailableScreens.EDIT_PROFILE}
                currentUser={mockCurrentUser}
                isModal={false}
                isTablet={false}
                lockedFirstName={false}
                lockedLastName={false}
                lockedNickname={false}
                lockedPosition={false}
                lockedPicture={false}
                enableCustomAttributes={true}
                customFields={[]}
                customAttributesSet={{}}
            />,
        );

        // Verify the ProfileForm component is rendered (which means customFields was passed)
        const scrollView = screen.getByTestId('edit_profile.scroll_view');
        expect(scrollView).toBeTruthy();
    });
});
