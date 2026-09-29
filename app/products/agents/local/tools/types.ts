// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type ToolResult = {
    forToolStep: string;
    forAnswer: string;
};

export type ToolArgs = Record<string, unknown>;
