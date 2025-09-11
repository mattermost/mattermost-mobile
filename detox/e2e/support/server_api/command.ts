// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';
import {apiAdminLogin} from './user';

const apiCreateCommand = async (baseUrl: string, command: any) => {
    try {
        // Login as admin to get authentication
        await apiAdminLogin(baseUrl);
        
        // Create the slash command
        return await client.post(
            `${baseUrl}/api/v4/commands`,
            command,
        );
    } catch (err) {
        return getResponseFromError(err);
    }
};

const Command = {
    apiCreateCommand,
};

export default Command;