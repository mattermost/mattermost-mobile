// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type AlertTypeType = 'notification' | 'developer' | 'error';
export type AlertType = {
    type: AlertTypeType;
    message: string;
};
