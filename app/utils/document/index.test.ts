// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {alertFailedToOpenDocument, alertDownloadDocumentDisabled, alertDownloadFailed} from './';

import type {IntlShape} from 'react-intl';

jest.mock('react-native', () => ({
    Alert: {
        alert: jest.fn(),
    },
}));

describe('alertUtils', () => {
    const intlMock = {
        formatMessage: jest.fn(),
    } as unknown as IntlShape;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should alert failed to open document with correct messages', () => {
        const file = {extension: 'pdf'} as FileInfo;

        intlMock.formatMessage.

            //@ts-expect-error type definition
            mockReturnValueOnce('Open Document failed').
            mockReturnValueOnce('An error occurred while opening the document. Please make sure you have a PDF viewer installed and try again.\n').
            mockReturnValueOnce('OK');

        alertFailedToOpenDocument(file, intlMock);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Open Document failed',
            'An error occurred while opening the document. Please make sure you have a PDF viewer installed and try again.\n',
            [{text: 'OK'}],
        );
    });

    it('should alert download document disabled with correct messages', () => {
        intlMock.formatMessage.

            //@ts-expect-error type definition
            mockReturnValueOnce('Download disabled').
            mockReturnValueOnce('File downloads are disabled on this server. Please contact your System Admin for more details.\n').
            mockReturnValueOnce('OK');

        alertDownloadDocumentDisabled(intlMock);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Download disabled',
            'File downloads are disabled on this server. Please contact your System Admin for more details.\n',
            [{text: 'OK'}],
        );
    });

    it('should alert download failed with correct messages', () => {
        intlMock.formatMessage.

            //@ts-expect-error type definition
            mockReturnValueOnce('Download failed').
            mockReturnValueOnce('An error occurred while downloading the file. Please check your internet connection and try again.\n').
            mockReturnValueOnce('OK');

        alertDownloadFailed(intlMock);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Download failed',
            'An error occurred while downloading the file. Please check your internet connection and try again.\n',
            [{text: 'OK'}],
        );
    });
});
