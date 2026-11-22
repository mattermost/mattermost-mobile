// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {errorCodes, isErrorWithCode, keepLocalCopy, pick} from '@react-native-documents/picker';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';
import {logError} from '@utils/log';

import ServerForm from './form';

jest.mock('@react-native-documents/picker', () => ({
    pick: jest.fn(),
    keepLocalCopy: jest.fn(),
    isErrorWithCode: jest.fn(() => false),
    errorCodes: {OPERATION_CANCELED: 'OPERATION_CANCELED'},
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
    logDebug: jest.fn(),
    logInfo: jest.fn(),
    logWarning: jest.fn(),
}));

describe('ServerForm - server CA certificate', () => {
    const baseProps = {
        buttonDisabled: false,
        connecting: false,
        disableServerUrl: false,
        handleConnect: jest.fn(),
        handleDisplayNameTextChanged: jest.fn(),
        handlePreauthSecretTextChanged: jest.fn(),
        handleUrlTextChanged: jest.fn(),
        setServerCaFile: jest.fn(),
        setServerCaError: jest.fn(),
        setShowAdvancedOptions: jest.fn(),
        showAdvancedOptions: true,
        theme: Preferences.THEMES.denim,
    };

    const pickedFile = {
        uri: 'content://com.android.providers.downloads/document/42',
        name: 'my-ca.pem',
        type: 'application/x-pem-file',
        size: 1234,
    };

    beforeEach(() => {
        jest.mocked(isErrorWithCode).mockReturnValue(false);
        jest.mocked(pick).mockResolvedValue([pickedFile] as never);
        jest.mocked(keepLocalCopy).mockResolvedValue([{
            status: 'success',
            sourceUri: pickedFile.uri,
            localUri: 'file:///cache/my-ca.pem',
        }] as never);
    });

    it('should not show the CA picker while advanced options are collapsed', () => {
        renderWithIntl(
            <ServerForm
                {...baseProps}
                showAdvancedOptions={false}
            />,
        );

        expect(screen.queryByTestId('server_form.server_ca.button')).toBeNull();
    });

    it('should show the CA picker inside advanced options', () => {
        renderWithIntl(<ServerForm {...baseProps}/>);

        expect(screen.getByTestId('server_form.server_ca.button')).toBeTruthy();
        expect(screen.getByText('Select CA certificate')).toBeTruthy();
        expect(screen.queryByTestId('server_form.server_ca.name')).toBeNull();
        expect(screen.queryByTestId('server_form.server_ca.error')).toBeNull();
    });

    it('should pick a file, keep a local copy and report it', async () => {
        renderWithIntl(<ServerForm {...baseProps}/>);

        fireEvent.press(screen.getByTestId('server_form.server_ca.button'));

        await waitFor(() => {
            expect(baseProps.setServerCaFile).toHaveBeenCalledWith({
                name: 'my-ca.pem',
                uri: 'file:///cache/my-ca.pem',
            });
        });
        expect(pick).toHaveBeenCalledWith({allowMultiSelection: false, type: ['*/*']});
        expect(keepLocalCopy).toHaveBeenCalledWith({
            files: [{uri: pickedFile.uri, fileName: 'my-ca.pem'}],
            destination: 'cachesDirectory',
        });
        expect(baseProps.setServerCaError).toHaveBeenCalledWith(undefined);
    });

    it('should fall back to a default file name when the picker returns none', async () => {
        jest.mocked(pick).mockResolvedValue([{...pickedFile, name: null}] as never);
        renderWithIntl(<ServerForm {...baseProps}/>);

        fireEvent.press(screen.getByTestId('server_form.server_ca.button'));

        await waitFor(() => {
            expect(baseProps.setServerCaFile).toHaveBeenCalledWith(expect.objectContaining({name: 'ca.pem'}));
        });
    });

    it('should do nothing when the user cancels the picker', async () => {
        const cancelError = {code: errorCodes.OPERATION_CANCELED};
        jest.mocked(pick).mockRejectedValue(cancelError);
        jest.mocked(isErrorWithCode).mockReturnValue(true);
        renderWithIntl(<ServerForm {...baseProps}/>);

        fireEvent.press(screen.getByTestId('server_form.server_ca.button'));

        await waitFor(() => {
            expect(isErrorWithCode).toHaveBeenCalledWith(cancelError);
        });
        expect(keepLocalCopy).not.toHaveBeenCalled();
        expect(baseProps.setServerCaFile).not.toHaveBeenCalled();
        expect(baseProps.setServerCaError).not.toHaveBeenCalled();
        expect(logError).not.toHaveBeenCalled();
    });

    it('should report an error when the picker fails', async () => {
        jest.mocked(pick).mockRejectedValue(new Error('picker failed'));
        renderWithIntl(<ServerForm {...baseProps}/>);

        fireEvent.press(screen.getByTestId('server_form.server_ca.button'));

        await waitFor(() => {
            expect(baseProps.setServerCaError).toHaveBeenCalledWith('Could not open the selected file');
        });
        expect(baseProps.setServerCaFile).not.toHaveBeenCalled();
        expect(logError).toHaveBeenCalled();
    });

    it('should report an error when the local copy fails', async () => {
        jest.mocked(keepLocalCopy).mockResolvedValue([{
            status: 'error',
            sourceUri: pickedFile.uri,
            copyError: 'no space left',
        }] as never);
        renderWithIntl(<ServerForm {...baseProps}/>);

        fireEvent.press(screen.getByTestId('server_form.server_ca.button'));

        await waitFor(() => {
            expect(baseProps.setServerCaError).toHaveBeenCalledWith('Could not open the selected file');
        });
        expect(baseProps.setServerCaFile).not.toHaveBeenCalled();
    });

    it('should show the selected file and allow changing it', () => {
        renderWithIntl(
            <ServerForm
                {...baseProps}
                serverCaFile={{name: 'my-ca.pem', uri: 'file:///cache/my-ca.pem'}}
            />,
        );

        expect(screen.getByTestId('server_form.server_ca.name')).toHaveTextContent('my-ca.pem');
        expect(screen.getByText('Change CA certificate')).toBeTruthy();
    });

    it('should clear the selected file', () => {
        renderWithIntl(
            <ServerForm
                {...baseProps}
                serverCaFile={{name: 'my-ca.pem', uri: 'file:///cache/my-ca.pem'}}
                serverCaError='Some error'
            />,
        );

        fireEvent.press(screen.getByTestId('server_form.server_ca.clear'));

        expect(baseProps.setServerCaFile).toHaveBeenCalledWith(undefined);
        expect(baseProps.setServerCaError).toHaveBeenCalledWith(undefined);
    });

    it('should show the CA error', () => {
        renderWithIntl(
            <ServerForm
                {...baseProps}
                serverCaError='Could not apply the selected CA certificate'
            />,
        );

        expect(screen.getByTestId('server_form.server_ca.error')).toHaveTextContent('Could not apply the selected CA certificate');
    });
});
