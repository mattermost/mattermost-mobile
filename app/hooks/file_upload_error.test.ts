// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import {UPLOAD_ERROR_SHOW_INTERVAL} from '@constants/files';

import useFileUploadError from './file_upload_error';

jest.useFakeTimers();

describe('useFileUploadError', () => {
    afterEach(() => {
        jest.clearAllTimers();
    });

    it('should initialize with no upload error', () => {
        const {result} = renderHook(() => useFileUploadError());
        expect(result.current.uploadError).toBeNull();
        expect(typeof result.current.newUploadError).toBe('function');
    });

    it('should set upload error when newUploadError is called', () => {
        const {result} = renderHook(() => useFileUploadError());
        const errorMessage = 'Upload failed';
        act(() => {
            result.current.newUploadError(errorMessage);
        });
        expect(result.current.uploadError).toBe(errorMessage);
    });

    it('should clear upload error after timeout', () => {
        const {result} = renderHook(() => useFileUploadError());
        const errorMessage = 'Upload failed';
        act(() => {
            result.current.newUploadError(errorMessage);
        });
        expect(result.current.uploadError).toBe(errorMessage);
        act(() => {
            jest.advanceTimersByTime(UPLOAD_ERROR_SHOW_INTERVAL);
        });
        expect(result.current.uploadError).toBeNull();
    });

    it('should handle different types of error messages', () => {
        const {result} = renderHook(() => useFileUploadError());
        const complexErrorMessage = 'Complex error: File size too large (5MB), maximum allowed is 2MB';
        act(() => {
            result.current.newUploadError(complexErrorMessage);
        });
        expect(result.current.uploadError).toBe(complexErrorMessage);
    });

    it('should clear previous timeout when new error is set', () => {
        const {result} = renderHook(() => useFileUploadError());
        const firstError = 'First error';
        const secondError = 'Second error';

        // Set first error
        act(() => {
            result.current.newUploadError(firstError);
        });
        expect(result.current.uploadError).toBe(firstError);

        // Set second error before first timeout completes
        act(() => {
            jest.advanceTimersByTime(2000); // Advance partway through first timeout
            result.current.newUploadError(secondError);
        });
        expect(result.current.uploadError).toBe(secondError);

        // Advance to where first timeout would have completed
        act(() => {
            jest.advanceTimersByTime(3000); // Total 5000ms from first error
        });

        // Error should still be second error (first timeout was cleared)
        expect(result.current.uploadError).toBe(secondError);

        // Complete second timeout
        act(() => {
            jest.advanceTimersByTime(2000); // Complete 5000ms from second error
        });

        expect(result.current.uploadError).toBeNull();
    });

    it('should not clear error before timeout completes', () => {
        const {result} = renderHook(() => useFileUploadError());
        const errorMessage = 'Upload failed';
        act(() => {
            result.current.newUploadError(errorMessage);
        });

        expect(result.current.uploadError).toBe(errorMessage);

        // Advance time but not to full timeout
        act(() => {
            jest.advanceTimersByTime(UPLOAD_ERROR_SHOW_INTERVAL - 1000);
        });

        // Error should still be present
        expect(result.current.uploadError).toBe(errorMessage);
    });

    it('should handle multiple consecutive errors correctly', () => {
        const {result} = renderHook(() => useFileUploadError());
        const error1 = 'Error 1';
        const error2 = 'Error 2';
        const error3 = 'Error 3';

        // Set first error
        act(() => {
            result.current.newUploadError(error1);
        });
        expect(result.current.uploadError).toBe(error1);

        // Quickly set second error
        act(() => {
            result.current.newUploadError(error2);
        });
        expect(result.current.uploadError).toBe(error2);

        // Quickly set third error
        act(() => {
            result.current.newUploadError(error3);
        });
        expect(result.current.uploadError).toBe(error3);

        // Only the last timeout should be active
        act(() => {
            jest.advanceTimersByTime(UPLOAD_ERROR_SHOW_INTERVAL);
        });

        expect(result.current.uploadError).toBeNull();
    });
});

