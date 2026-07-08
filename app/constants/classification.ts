// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ---------------------------------------------------------------------------
// Classification-markings constants
//
// The classification system uses two linked property-field "object types":
//
//   1. System field  — drives the GLOBAL banner. Linked to the server-side
//                      template and inherits its options/colors.
//   2. Channel field — drives PER-CHANNEL banners. Also linked to the
//                      template and inherits its options/colors.
//
// Both fields share the same field name on the server and are distinguished
// only by their object_type ('system' vs 'channel'). They are also scoped
// server-side as system fields, so they share the same field-level target
// attributes (`target_type='system'`, `target_id=''`). Property *values* for
// the system field are stored on the dedicated system endpoint and use the
// sentinel target_id 'system'.
// ---------------------------------------------------------------------------

// Property-field group identifying all classification-markings entities.
export const CLASSIFICATIONS_GROUP_NAME = 'access_control';

// Field-level target attributes shared by system and channel fields.
// `target_type` is always 'system'; `target_id` is empty for system-scoped
// field definitions (the server canonicalizes both).
export const CLASSIFICATIONS_FIELD_TARGET_TYPE = 'system';
export const CLASSIFICATIONS_FIELD_TARGET_ID = '';

// Shared field name for both the system and channel classification fields.
export const CLASSIFICATIONS_FIELD_NAME = 'classification';

// System field — drives the global banner. Property *values* live on the
// dedicated system endpoint and use the sentinel target_id 'system'.
export const CLASSIFICATIONS_SYSTEM_OBJECT_TYPE = 'system';
export const CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID = 'system';

// Channel field — drives the per-channel banner.
export const CLASSIFICATIONS_CHANNEL_OBJECT_TYPE = 'channel';

// Actions stored on the linked fields' attrs.actions to control banner placement.
export const DISPLAY_BANNER_TOP = 'display_banner_top';
export const DISPLAY_BANNER_BOTTOM = 'display_banner_bottom';
