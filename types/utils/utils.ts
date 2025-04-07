// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type FirstArgument<T> = T extends (...args: infer P) => any ? P[0] : never;
