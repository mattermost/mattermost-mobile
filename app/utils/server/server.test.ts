// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {getIntlShape} from '@utils/general';

import {unsupportedServer} from '.';

describe('Unsupported Server Alert', () => {
    const intl = getIntlShape();

    it('should show the alert for sysadmin', () => {
        const alert = jest.spyOn(Alert, 'alert');
        unsupportedServer('Default Server', true, intl);
        expect(alert?.mock?.calls?.[0]?.[2]?.length).toBe(2);
    });

    it('should show the alert for team admin / user', () => {
        const alert = jest.spyOn(Alert, 'alert');
        unsupportedServer('Default Server', false, intl);
        expect(alert?.mock?.calls?.[0]?.[2]?.length).toBe(1);
    });
});
