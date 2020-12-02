// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export type MigrationEvents = {
    onSuccess?: () => void,
    onStarted?: () => void,
    onFailure?: (error: string) => void,
}
