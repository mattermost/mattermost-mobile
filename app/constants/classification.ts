// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const GROUP_NAME = 'classification_markings';

// OBJECT_TYPE is 'template' so the classification field acts as the canonical schema.
export const OBJECT_TYPE = 'template';
export const TARGET_TYPE = 'system';
export const TARGET_ID = '';
export const FIELD_NAME = 'classification';
export const LINKED_FIELD_NAME = 'system_classification';

// The linked field uses the 'system' object type.
export const LINKED_OBJECT_TYPE = 'system';

// System-scoped fields have target_id '' on the field definition.
export const SYSTEM_FIELD_TARGET_ID = '';

// The sentinel target_id used by the server for system-scoped property values.
export const SYSTEM_VALUE_TARGET_ID = 'system';

export const DISPLAY_BANNER_TOP = 'display_banner_top';
export const DISPLAY_BANNER_BOTTOM = 'display_banner_bottom';
