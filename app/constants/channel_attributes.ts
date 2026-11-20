// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CLASSIFICATIONS_SYSTEM_OBJECT_TYPE} from '@constants/classification';

// ---------------------------------------------------------------------------
// Channel attributes
//
// A channel attribute is a PropertyField with object_type='channel', linked to
// a template field, holding one value per channel. Classification Markings is
// one instance of this shape rather than a separate system: it lives in the
// same `access_control` group and is selected by the same keys.
//
// Three layers, one direction of travel:
//
//   template field  - canonical name, type, options, colours, ranks
//   channel field   - ONE global field carrying per-channel settings in attrs
//   channel value   - one PropertyValue per channel, keyed on the channel field
//
// Everything rendered comes from joining the second to the third.
// ---------------------------------------------------------------------------

// The PSAv2 property group every channel attribute belongs to. Shared with
// Custom Profile Attributes and Classification Markings, which is why the
// group alone is not a narrow enough filter (see observeChannelAttributeFields).
export const ACCESS_CONTROL_GROUP_NAME = 'access_control';

export const CHANNEL_ATTRIBUTE_OBJECT_TYPE = 'channel';

// Custom Profile Attributes in the same group: the attributes an ABAC subject is built from.
export const USER_ATTRIBUTE_OBJECT_TYPE = 'user';

// The server rejects a values PATCH with more items than this instead of truncating it.
export const MAX_PROPERTY_VALUE_PATCH_ITEMS = 50;

// Types whose stored value is an option id, so it can point at a renamed or removed option.
export const OPTION_BACKED_FIELD_TYPES = new Set<string>(['select', 'multiselect', 'rank']);

// Matches the server limit; longer input gets a 400, not a trim.
export const PROPERTY_TEXT_VALUE_MAX_LENGTH = 64;

// POST /channels error when a required attribute was left empty. It names no attribute
// (which attributes exist is sensitive), so the create screen maps it to its own string.
export const MISSING_REQUIRED_ATTRIBUTES_ERROR_ID = 'api.channel.create_channel.missing_required_attributes.app_error';

// ASCII unit separator. Option and field names are free text, so a printable
// separator could let two different configurations produce the same signature.
export const SIGNATURE_SEPARATOR = '\u001f';

// Values of a field's attrs.actions, deciding where its value displays. The
// server allow-lists exactly these four, so an unknown value here means the
// contract moved.
//
// display_banner_bottom is validated server-side but always renders at the top,
// so it is treated as top everywhere and never offered as a position.
export const DISPLAY_BANNER_TOP = 'display_banner_top';
export const DISPLAY_BANNER_BOTTOM = 'display_banner_bottom';
export const DISPLAY_LABEL_HEADER = 'display_label_header';

// Feature flag config keys — stored as constants so callers don't spread bare
// strings and grep can find all references.
export const FEATURE_FLAG_CHANNEL_ATTRIBUTES = 'FeatureFlagChannelAttributes';
export const FEATURE_FLAG_CHANNEL_ATTRIBUTES_REQUIRED = 'FeatureFlagChannelAttributesRequired';

// Neutral chip colours for the dark channel header. Shared between AttributeChip
// and the +N overflow pill in ChannelAttributeLabels so both stay in sync.
export const NEUTRAL_CHIP_HEADER_BG = '#DADCE0';
export const NEUTRAL_CHIP_HEADER_TEXT = '#1D2433';

// The PropertyField object_types this feature owns inside the shared
// access_control group. Used to scope deletions and field-event fanout to only
// the rows that belong here — the group is shared with user/session fields that
// belong to other features.
export const OWNED_OBJECT_TYPES = new Set<PropertyFieldObjectType>([CLASSIFICATIONS_SYSTEM_OBJECT_TYPE, CHANNEL_ATTRIBUTE_OBJECT_TYPE]);
