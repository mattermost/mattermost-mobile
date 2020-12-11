// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Migration} from '@nozbe/watermelondb/Schema/migrations';
import {AppSchema, Model} from '@nozbe/watermelondb';
import {DatabaseAdapter} from '@nozbe/watermelondb/adapters/type';
import {Class} from '@nozbe/watermelondb/utils/common';

export type MigrationEvents = {
    onSuccess?: () => void,
    onStarted?: () => void,
    onFailure?: (error: string) => void,
}

export type MMAdaptorOptions = {
    dbPath : string,
    schema: AppSchema,
    migrationSteps?: Migration [],
    migrationEvents?: MigrationEvents
}

export type MMDatabaseConnection = {
    actionsEnabled: boolean,
    adapter: DatabaseAdapter,
    modelClasses: Array<Class<Model>>
}
