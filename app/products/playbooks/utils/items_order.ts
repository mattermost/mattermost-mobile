// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function areItemsOrdersEqual(fromRaw: string[], fromRecord: string[] | undefined) {
    if (!fromRecord) {
        return false;
    }

    const rawLength = fromRaw.length;
    const recordLength = fromRecord.length;

    if (rawLength !== recordLength) {
        return false;
    }

    for (let i = 0; i < rawLength; i++) {
        if (fromRaw[i] !== fromRecord[i]) {
            return false;
        }
    }

    return true;
}
