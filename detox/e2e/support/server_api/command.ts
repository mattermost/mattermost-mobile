// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

export const apiCreateCommand = async (baseUrl: string, command: Record<string, any>): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/commands`,
            command,
        );

        return {command: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const Command = {
    apiCreateCommand,
};

export default Command;
