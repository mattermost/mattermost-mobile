// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ClientError} from '@utils/client_error';

export interface jsAndNativeErrorHandler {
    initializeErrorHandling: () => void;
    nativeErrorHandler: (e: string) => void;
    errorHandler: (e: Error | ClientError, isFatal: boolean) => void;
}
