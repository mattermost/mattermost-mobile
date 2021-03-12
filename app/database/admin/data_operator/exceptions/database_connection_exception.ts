// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class DatabaseConnectionException extends Error {
    tableName: string;
    constructor(message: string, tableName: string) {
        super(message);
        this.tableName = tableName;
        this.name = 'DatabaseConnectionException';
    }
}
export default DatabaseConnectionException;
