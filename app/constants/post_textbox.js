// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Platform} from 'react-native';

export const INITIAL_HEIGHT = Platform.OS === 'ios' ? 34 : 36;
export const MAX_CONTENT_HEIGHT = 100;
export const MAX_FILE_COUNT = 5;
export const IS_REACTION_REGEX = /(^\+:([^:\s]*):)$/i;
export const INSERT_TO_DRAFT = 'insert_to_draft';
export const INSERT_TO_COMMENT = 'insert_to_comment';