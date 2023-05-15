// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface jsAndNativeErrorHandler {
    initializeErrorHandling: () => void;
    nativeErrorHandler: (e: string) => void;
    errorHandler: (e: unknown, isFatal: boolean) => void;
}
