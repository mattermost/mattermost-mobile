// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import {fireEvent, screen} from '@testing-library/react-native';

import {deletePost, burnPostNow} from '@actions/remote/post';
import {dismissBottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {isBoRPost, isOwnBoRPost} from '@utils/bor';

import DeletePostOption from './delete_post_option';

import type {Database} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

// Mock the dependencies
jest.mock('@actions/remote/post');
jest.mock('@screens/navigation');
jest.mock('@utils/bor');
jest.mock('react-native', () => ({
    ...jest.requireActual('react-native'),
    Alert: {
        alert: jest.fn(),
    },
}));

const mockDeletePost = deletePost as jest.MockedFunction<typeof deletePost>;
const mockBurnPostNow = burnPostNow as jest.MockedFunction<typeof burnPostNow>;
const mockDismissBottomSheet = dismissBottomSheet as jest.MockedFunction<typeof dismissBottomSheet>;
const mockIsBoRPost = isBoRPost as jest.MockedFunction<typeof isBoRPost>;
const mockIsOwnBoRPost = isOwnBoRPost as jest.MockedFunction<typeof isOwnBoRPost>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('DeletePostOption', () => {
    let database: Database;
    let mockPost: PostModel;
    let mockCurrentUser: UserModel;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockPost = {
            id: 'post-id-1',
            userId: 'user-id-1',
        } as PostModel;

        mockCurrentUser = {
            id: 'user-id-1',
        } as UserModel;

        mockDismissBottomSheet.mockResolvedValue();
        mockDeletePost.mockResolvedValue({} as any);
        mockBurnPostNow.mockResolvedValue({} as any);
    });

    const defaultProps = {
        bottomSheetId: 'PostOptions' as const,
        post: mockPost,
        currentUser: mockCurrentUser,
    };

    it('should render delete option with correct text and icon', () => {
        mockIsBoRPost.mockReturnValue(false);

        renderWithEverything(
            <DeletePostOption {...defaultProps} />,
            {database},
        );

        expect(screen.getByText('Delete')).toBeVisible();
        expect(screen.getByTestId('post_options.delete_post.option')).toBeVisible();
    });

    describe('Regular Post Deletion', () => {
        beforeEach(() => {
            mockIsBoRPost.mockReturnValue(false);
        });

        it('should show confirmation alert when pressed for regular post', () => {
            renderWithEverything(
                <DeletePostOption {...defaultProps} />,
                {database},
            );

            const deleteOption = screen.getByTestId('post_options.delete_post.option');
            fireEvent.press(deleteOption);

            expect(mockAlert).toHaveBeenCalledWith(
                'Delete Post',
                'Are you sure you want to delete this post?',
                expect.arrayContaining([
                    expect.objectContaining({
                        text: 'Cancel',
                        style: 'cancel',
                    }),
                    expect.objectContaining({
                        text: 'Delete',
                        style: 'destructive',
                        onPress: expect.any(Function),
                    }),
                ]),
            );
        });

        it('should call deletePost when confirmed for regular post', async () => {
            renderWithEverything(
                <DeletePostOption {...defaultProps} />,
                {database},
            );

            const deleteOption = screen.getByTestId('post_options.delete_post.option');
            fireEvent.press(deleteOption);

            // Get the onPress function from the Delete button and call it
            const alertCalls = mockAlert.mock.calls;
            const deleteButtonConfig = alertCalls[0][2]?.find((button: any) => button.text === 'Delete');
            await deleteButtonConfig?.onPress();

            expect(mockDismissBottomSheet).toHaveBeenCalledWith('PostOptions');
            expect(mockDeletePost).toHaveBeenCalledWith(expect.any(String), mockPost);
        });

        it('should use combinedPost when provided for regular post', async () => {
            const combinedPost = {id: 'combined-post-id'} as Post;
            
            renderWithEverything(
                <DeletePostOption {...defaultProps} combinedPost={combinedPost} />,
                {database},
            );

            const deleteOption = screen.getByTestId('post_options.delete_post.option');
            fireEvent.press(deleteOption);

            const alertCalls = mockAlert.mock.calls;
            const deleteButtonConfig = alertCalls[0][2]?.find((button: any) => button.text === 'Delete');
            await deleteButtonConfig?.onPress();

            expect(mockDeletePost).toHaveBeenCalledWith(expect.any(String), combinedPost);
        });
    });

    describe('BoR Post Deletion', () => {
        beforeEach(() => {
            mockIsBoRPost.mockReturnValue(true);
        });

        it('should show BoR confirmation alert for sender', () => {
            mockIsOwnBoRPost.mockReturnValue(true);

            renderWithEverything(
                <DeletePostOption {...defaultProps} />,
                {database},
            );

            const deleteOption = screen.getByTestId('post_options.delete_post.option');
            fireEvent.press(deleteOption);

            expect(mockAlert).toHaveBeenCalledWith(
                'Delete Message Now?',
                'This message will be permanently deleted for all recipients right away. This action can\'t be undone. Are you sure you want to delete this message?',
                expect.arrayContaining([
                    expect.objectContaining({
                        text: 'Cancel',
                        style: 'cancel',
                    }),
                    expect.objectContaining({
                        text: 'Delete',
                        style: 'destructive',
                        onPress: expect.any(Function),
                    }),
                ]),
            );
        });

        it('should show BoR confirmation alert for receiver', () => {
            mockIsOwnBoRPost.mockReturnValue(false);

            renderWithEverything(
                <DeletePostOption {...defaultProps} />,
                {database},
            );

            const deleteOption = screen.getByTestId('post_options.delete_post.option');
            fireEvent.press(deleteOption);

            expect(mockAlert).toHaveBeenCalledWith(
                'Delete Message Now?',
                'This message will be permanently deleted for you right away and can\'t be undone.',
                expect.arrayContaining([
                    expect.objectContaining({
                        text: 'Cancel',
                        style: 'cancel',
                    }),
                    expect.objectContaining({
                        text: 'Delete',
                        style: 'destructive',
                        onPress: expect.any(Function),
                    }),
                ]),
            );
        });

        it('should call burnPostNow when confirmed for BoR post', async () => {
            mockIsOwnBoRPost.mockReturnValue(true);

            renderWithEverything(
                <DeletePostOption {...defaultProps} />,
                {database},
            );

            const deleteOption = screen.getByTestId('post_options.delete_post.option');
            fireEvent.press(deleteOption);

            const alertCalls = mockAlert.mock.calls;
            const deleteButtonConfig = alertCalls[0][2]?.find((button: any) => button.text === 'Delete');
            await deleteButtonConfig?.onPress();

            expect(mockDismissBottomSheet).toHaveBeenCalledWith('PostOptions');
            expect(mockBurnPostNow).toHaveBeenCalledWith(expect.any(String), mockPost);
        });

        it('should use combinedPost when provided for BoR post', async () => {
            const combinedPost = {id: 'combined-post-id'} as Post;
            mockIsOwnBoRPost.mockReturnValue(true);
            
            renderWithEverything(
                <DeletePostOption {...defaultProps} combinedPost={combinedPost} />,
                {database},
            );

            const deleteOption = screen.getByTestId('post_options.delete_post.option');
            fireEvent.press(deleteOption);

            const alertCalls = mockAlert.mock.calls;
            const deleteButtonConfig = alertCalls[0][2]?.find((button: any) => button.text === 'Delete');
            await deleteButtonConfig?.onPress();

            expect(mockBurnPostNow).toHaveBeenCalledWith(expect.any(String), combinedPost);
        });
    });

    it('should not call any delete functions when cancel is pressed', () => {
        mockIsBoRPost.mockReturnValue(false);

        renderWithEverything(
            <DeletePostOption {...defaultProps} />,
            {database},
        );

        const deleteOption = screen.getByTestId('post_options.delete_post.option');
        fireEvent.press(deleteOption);

        // Simulate pressing Cancel
        const alertCalls = mockAlert.mock.calls;
        const cancelButtonConfig = alertCalls[0][2]?.find((button: any) => button.text === 'Cancel');
        cancelButtonConfig?.onPress?.();

        expect(mockDeletePost).not.toHaveBeenCalled();
        expect(mockBurnPostNow).not.toHaveBeenCalled();
        expect(mockDismissBottomSheet).not.toHaveBeenCalled();
    });
});
