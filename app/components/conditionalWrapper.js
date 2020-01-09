// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-confusing-arrow */
export const ConditionalWrapper = ({conditional, wrapper, children}) => conditional ? wrapper(children) : children;
