// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import type {IntlShape} from 'react-intl';

export function alertFailedToOpenDocument(file: FileInfo, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.document_preview.failed_title',
            defaultMessage: 'Open Document failed',
        }),
        intl.formatMessage({
            id: 'mobile.document_preview.failed_description',
            defaultMessage: 'An error occurred while opening the document. Please make sure you have a {fileType} viewer installed and try again.\n',
        }, {
            fileType: file.extension.toUpperCase(),
        }),
        [{
            text: intl.formatMessage({
                id: 'mobile.server_upgrade.button',
                defaultMessage: 'OK',
            }),
        }],
    );
}

export function alertDownloadDocumentDisabled(intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.downloader.disabled_title',
            defaultMessage: 'Download disabled',
        }),
        intl.formatMessage({
            id: 'mobile.downloader.disabled_description',
            defaultMessage: 'File downloads are disabled on this server. Please contact your System Admin for more details.\n',
        }),
        [{
            text: intl.formatMessage({
                id: 'mobile.server_upgrade.button',
                defaultMessage: 'OK',
            }),
        }],
    );
}

export function alertOnlyPDFSupported(intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.document_preview.only_pdf_title',
            defaultMessage: 'Preview not supported',
        }),
        intl.formatMessage({
            id: 'mobile.document_preview.only_pdf_description',
            defaultMessage: 'Only PDF files can be previewed. Downloads are not allowed on this server.\n',
        }),
        [{
            text: intl.formatMessage({
                id: 'mobile.server_upgrade.button',
                defaultMessage: 'OK',
            }),
        }],
    );
}

export function alertDownloadFailed(intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.downloader.failed_title',
            defaultMessage: 'Download failed',
        }),
        intl.formatMessage({
            id: 'mobile.downloader.failed_description',
            defaultMessage: 'An error occurred while downloading the file. Please check your internet connection and try again.\n',
        }),
        [{
            text: intl.formatMessage({
                id: 'mobile.server_upgrade.button',
                defaultMessage: 'OK',
            }),
        }],
    );
}
