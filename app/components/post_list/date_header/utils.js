// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DATE_LINE} from 'app/selectors/post_list';

export const isDateLine = (dateString) => dateString.indexOf(DATE_LINE) === 0;
