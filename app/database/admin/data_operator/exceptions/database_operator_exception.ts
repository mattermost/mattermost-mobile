// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class DatabaseOperatorException extends Error {
    error : Error | undefined;
    constructor(message: string, error?: Error) {
        super(message);
        this.name = 'DatabaseOperatorException';
        this.error = error;
    }
}
export default DatabaseOperatorException;
