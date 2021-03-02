// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { RecordValue } from '@typings/database/database';
import OperatorFieldException from './exceptions/operator_field_exception';

type MissingFieldUtil = {
    fields: string[];
    rawValue: RecordValue;
    tableName: string;
};

export const checkForMissingFields = ({ fields, rawValue, tableName }: MissingFieldUtil) => {
    const missingFields = [];
    for (const rawField in Object.keys(rawValue)) {
        if (!fields.includes(rawField)) {
            missingFields.push(rawField);
        }
    }
    if (missingFields.length > 0) {
        throw new OperatorFieldException(
            `OperatorFieldException: The object for entity ${tableName} has some mandatory fields missing`,
            missingFields,
        );
    }
};
