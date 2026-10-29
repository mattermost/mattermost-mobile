// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ServerForm from './form';

import type {ServerCertificateInfo} from '@managers/server_certificate_manager';
import type Database from '@nozbe/watermelondb/Database';

const certificate: ServerCertificateInfo = {
    host: 'chat.example.test',
    fileName: 'cert.crt',
    subject: 'CN=Example Root CA',
    fingerprint: 'AA:BB',
    notAfter: 1,
};

let database: Database;

beforeAll(async () => {
    database = (await TestHelper.setupServerDatabase()).database;
});

function renderForm(overrides: Partial<React.ComponentProps<typeof ServerForm>> = {}) {
    const props: React.ComponentProps<typeof ServerForm> = {
        buttonDisabled: false,
        connecting: false,
        disableServerUrl: false,
        handleConnect: jest.fn(),
        handleDisplayNameTextChanged: jest.fn(),
        handleImportCertificate: jest.fn(),
        handlePreauthSecretTextChanged: jest.fn(),
        handleRemoveCertificate: jest.fn(),
        handleUrlTextChanged: jest.fn(),
        importingCertificate: false,
        setShowAdvancedOptions: jest.fn(),
        showAdvancedOptions: false,
        showCertificateImport: true,
        theme: Preferences.THEMES.denim,
        ...overrides,
    };
    renderWithEverything(<ServerForm {...props}/>, {database});
    return props;
}

describe('ServerForm CA certificate import', () => {
    it('hides the ENCMA Android-only control for other application builds', () => {
        renderForm({showCertificateImport: false});

        expect(screen.queryByTestId('server_form.certificate.container')).toBeNull();
    });

    it('imports a public CA and explains that validation remains enabled', () => {
        const props = renderForm();

        expect(screen.getByTestId('server_form.certificate.help')).toHaveTextContent(/trusted only inside ENCMA/);
        expect(screen.getByTestId('server_form.certificate.help')).toHaveTextContent(/hostname verification stays enabled/);
        expect(screen.queryByTestId('server_form.certificate.selected')).toBeNull();

        fireEvent.press(screen.getByTestId('server_form.certificate.import'));
        expect(props.handleImportCertificate).toHaveBeenCalledTimes(1);
    });

    it('shows the selected server certificate and supports replacement and removal', () => {
        const props = renderForm({certificate});

        expect(screen.getByTestId('server_form.certificate.selected')).toHaveTextContent('cert.crt · chat.example.test');
        expect(screen.getByTestId('server_form.certificate.import-label')).toHaveTextContent('Replace CA certificate');

        fireEvent.press(screen.getByTestId('server_form.certificate.import'));
        fireEvent.press(screen.getByTestId('server_form.certificate.remove'));
        expect(props.handleImportCertificate).toHaveBeenCalledTimes(1);
        expect(props.handleRemoveCertificate).toHaveBeenCalledTimes(1);
    });

    it('offers the three delivery modes before advanced options', () => {
        const props = renderForm({
            showNotificationDelivery: true,
            handleDeliveryModeChange: jest.fn(),
        });

        expect(screen.getByTestId('server_form.notification_delivery.radio.direct.button')).toBeTruthy();
        expect(screen.getByTestId('server_form.notification_delivery.radio.server_push.button')).toBeTruthy();
        expect(screen.getByTestId('server_form.notification_delivery.radio.off.button')).toBeTruthy();
        expect(screen.getByTestId('server_form.advanced_options.toggle')).toBeTruthy();

        fireEvent.press(screen.getByTestId('server_form.notification_delivery.radio.direct.button'));
        expect(props.handleDeliveryModeChange).toHaveBeenCalledWith('direct');
    });

    it('presents a safe import error without hiding the server form', () => {
        renderForm({certificateError: 'The selected certificate is not a CA certificate.'});

        expect(screen.getByTestId('server_form.certificate.error')).toHaveTextContent('The selected certificate is not a CA certificate.');
        expect(screen.getByTestId('server_form.server_url.input')).toBeTruthy();
        expect(screen.getByTestId('server_form.connect.button')).toBeTruthy();
    });
});
