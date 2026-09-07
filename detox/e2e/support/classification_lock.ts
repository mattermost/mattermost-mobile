// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createServerLock} from '@support/server_lock';

import type {AcquireLockOptions} from '@support/classification_lock_core';

const classificationLock = createServerLock('classification');

export const createClassificationLockOwner = (): string => {
    return classificationLock.createOwner();
};

export const acquireClassificationLock = async (
    baseUrl: string,
    owner: string,
    options: AcquireLockOptions = {},
): Promise<void> => {
    return classificationLock.acquire(baseUrl, owner, options);
};

export const releaseClassificationLock = async (baseUrl: string, owner: string): Promise<void> => {
    return classificationLock.release(baseUrl, owner);
};
