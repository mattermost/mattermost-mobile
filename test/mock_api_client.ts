// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {RequestOptions} from '@mattermost/react-native-network-client';

export const mockApiClient = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get: jest.fn((url: string, options?: RequestOptions) => ({status: 200, ok: true})),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    post: jest.fn((url: string, options?: RequestOptions) => ({status: 200, ok: true})),
};
