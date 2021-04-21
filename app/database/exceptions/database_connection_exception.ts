// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * DatabaseConnectionException: This error can be thrown whenever an issue arises with the Database
 */
class DatabaseConnectionException extends Error {
    tableName?: string;
    constructor(message: string, tableName?: string) {
        super(message);
        this.tableName = tableName;
        this.name = 'DatabaseConnectionException';
    }
}
export default DatabaseConnectionException;
