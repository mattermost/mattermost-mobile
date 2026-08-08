// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const filterEmptyOptions = (option: AppSelectOption): boolean => Boolean(option.value && !option.value.match(/^[ \t]+$/));
