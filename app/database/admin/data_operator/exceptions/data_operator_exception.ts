// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * DataOperatorException: This exception can be used whenever an issue arises at the operator level.  For example, if a required field is missing.
 */
class DataOperatorException extends Error {
    error : Error | undefined;
    constructor(message: string, error?: Error) {
        super(message);
        this.name = 'DatabaseOperatorException';
        this.error = error;
    }
}
export default DataOperatorException;
