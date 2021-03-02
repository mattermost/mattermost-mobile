// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class OperatorFieldException extends Error {
    missingFields: string[];
    constructor(message: string, missingFields: string[]) {
        super(message);
        this.missingFields = missingFields;
        this.name = 'OperatorFieldException';
    }
}
export default OperatorFieldException;
