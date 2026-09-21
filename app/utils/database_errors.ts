// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getFullErrorMessage} from '@utils/errors';

const DATABASE_CORRUPTION_MESSAGE = 'database disk image is malformed';

export function isDatabaseCorruptionError(error: unknown): boolean {
    return getFullErrorMessage(error).includes(DATABASE_CORRUPTION_MESSAGE);
}
