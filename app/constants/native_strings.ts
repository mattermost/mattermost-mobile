// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages} from 'react-intl';

// Keep native iOS strings in the extraction catalog. Fastlane writes these
// messages to Localizable.strings for the app and its native libraries.
export const iosNativeMessages = defineMessages({
    hardware_keyboard_find_channels: {
        id: 'native.ios.hardware_keyboard.find_channels',
        defaultMessage: 'Find channels',
    },
    hardware_keyboard_new_line: {
        id: 'native.ios.hardware_keyboard.new_line',
        defaultMessage: 'Add new line',
    },
    hardware_keyboard_send_message: {
        id: 'native.ios.hardware_keyboard.send_message',
        defaultMessage: 'Send message',
    },
    pdf_file_corrupted: {
        id: 'native.ios.pdf.file_corrupted',
        defaultMessage: 'The PDF file appears to be corrupted or damaged.',
    },
    pdf_file_not_pdf: {
        id: 'native.ios.pdf.file_not_pdf',
        defaultMessage: 'The file is not a valid PDF document.',
    },
    pdf_file_too_large: {
        id: 'native.ios.pdf.file_too_large',
        defaultMessage: 'The PDF file is too large to process: {size} MB. Maximum supported size is {limit} MB.',
    },
    pdf_incompatible_format: {
        id: 'native.ios.pdf.incompatible_format',
        defaultMessage: 'This PDF uses unsupported features or an incompatible format.',
    },
    pdf_internal_error: {
        id: 'native.ios.pdf.internal_error',
        defaultMessage: 'An internal error occurred while opening the PDF file.',
    },
    pdf_invalid_path: {
        id: 'native.ios.pdf.invalid_path',
        defaultMessage: 'Invalid file path',
    },
    pdf_memory_error: {
        id: 'native.ios.pdf.memory_error',
        defaultMessage: 'Not enough memory to load the PDF file.',
    },
    pdf_page_indicator: {
        id: 'native.ios.pdf.page_indicator',
        defaultMessage: '{current} of {total}',
    },
    pdf_unknown_error: {
        id: 'native.ios.pdf.unknown_error',
        defaultMessage: 'An unknown error occurred while opening the PDF file.',
    },
});
