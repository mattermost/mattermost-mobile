// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ---------------------------------------------------------------------------
// Classification-markings constants
//
// The classification system uses three property-field "object types":
//
//   1. Template field  — the canonical schema that defines the available
//                        classification levels (options, colors, etc.). System
//                        and channel fields link to it and inherit them.
//   2. System field    — linked-to-template; drives the GLOBAL banner. Lives
//                        on the dedicated 'system' object-type path.
//   3. Channel field   — linked-to-template; drives PER-CHANNEL banners.
//
// All three fields are scoped server-side as system fields, so they share the
// same field-level target attributes (`target_type='system'`, `target_id=''`).
// Property *values* for the system field are stored on the dedicated system
// endpoint and use the sentinel target_id 'system'.
// ---------------------------------------------------------------------------

// Property-field group identifying all classification-markings entities.
export const CLASSIFICATIONS_GROUP_NAME = 'classification_markings';

// Field-level target attributes shared by template, system, and channel fields.
// `target_type` is always 'system'; `target_id` is empty for system-scoped
// field definitions (the server canonicalizes both).
export const CLASSIFICATIONS_FIELD_TARGET_TYPE = 'system';
export const CLASSIFICATIONS_FIELD_TARGET_ID = '';

// Template field — the canonical schema.
export const CLASSIFICATIONS_TEMPLATE_OBJECT_TYPE = 'template';
export const CLASSIFICATIONS_TEMPLATE_FIELD_NAME = 'classification';

// System field — drives the global banner. Property *values* live on the
// dedicated system endpoint and use the sentinel target_id 'system'.
export const CLASSIFICATIONS_SYSTEM_OBJECT_TYPE = 'system';
export const CLASSIFICATIONS_SYSTEM_FIELD_NAME = 'system_classification';
export const CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID = 'system';

// Channel field — drives the per-channel banner.
export const CLASSIFICATIONS_CHANNEL_OBJECT_TYPE = 'channel';
export const CLASSIFICATIONS_CHANNEL_FIELD_NAME = 'channel_classification';

// Actions stored on the linked fields' attrs.actions to control banner placement.
export const DISPLAY_BANNER_TOP = 'display_banner_top';
export const DISPLAY_BANNER_BOTTOM = 'display_banner_bottom';
