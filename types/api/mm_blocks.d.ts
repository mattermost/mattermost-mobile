// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// mm_blocks — canonical block schema for the Interactive Messages framework.
// The server treats mm_blocks as opaque data; all validation and rendering is client-side.
//
// Native payloads use `props.mm_blocks` as a `MmBlock[]`. Each interactive control carries its
// own dispatch data: post actions use `action_id` (and optional `value` / `query`); client-side URL
// opens use `url`. Optional per-control `query` is sent in the post-action API body alongside
// `selected_option`, `cookie`, and `integration_format` (e.g. `mm_block`).
//
// Cookie handling:
// - Native mm_blocks: the client sends `props.mm_blocks_actions` (string) as the post-action cookie.
// - Legacy attachments translated into mm_blocks: each control may carry `cookie` copied from
//   `props.attachments[].actions[].cookie` (encrypted PostAction cookie per button/select).

type MmButtonStyle = 'default' | 'primary' | 'danger';

// ---------------------------------------------------------------------------
// Interactive controls
// ---------------------------------------------------------------------------

type MmStaticSelectOption = {
    text: string;
    value: string;
};

type MmButtonBlock = {
    type: 'button';
    text: string;
    action_id: string;
    style?: MmButtonStyle;
    tooltip?: string;
    disabled?: boolean;
    query?: Record<string, string>;

    /**
     * Legacy attachment actions only: encrypted cookie from `attachments[].actions[].cookie`.
     * Omitted for native mm_blocks (use post `mm_blocks_actions` instead).
     */
    cookie?: string;
};

type MmStaticSelectBlock = {
    type: 'static_select';
    action_id: string;
    query?: Record<string, string>;
    placeholder: string;
    options?: MmStaticSelectOption[];
    initial_option?: string;
    disabled?: boolean;
    data_source?: string;

    /**
     * Legacy attachment actions only: encrypted cookie from `attachments[].actions[].cookie`.
     * Omitted for native mm_blocks (use post `mm_blocks_actions` instead).
     */
    cookie?: string;
};

// ---------------------------------------------------------------------------
// Top-level block types
// ---------------------------------------------------------------------------

type MmTextSize = 'small' | 'default';

type MmTextBlock = {
    type: 'text';
    text: string;

    /** Muted color only; does not change font size. */
    is_subtle?: boolean;

    /** Typography scale; omitted is equivalent to `default`. */
    size?: MmTextSize;
};

/**
 * Rich image block — combines ideas from Block Kit `image` and Adaptive Cards `Image`.
 *
 * Block Kit: `image_url` → `url`, `alt_text`, optional `title` (plain text).
 * Adaptive Cards: `url`, `altText` → `alt_text`, `size`, `style`, `horizontalAlignment`, explicit `width`/`height`.
 */
type MmImageSize = 'auto' | 'xsmall' | 'small' | 'medium' | 'large' | 'stretch';

type MmImageBlock = {
    type: 'image';

    /** Adaptive Cards `url` / Block Kit `image_url`. */
    url: string;

    /** Block Kit `alt_text` / Adaptive Cards `altText`. */
    alt_text: string;

    /** Block Kit image `title` (plain text); surfaced as the HTML `title` attribute. */
    title?: string;

    /**
     * Adaptive Cards `size`. `stretch` matches legacy attachment `image_url` bounds (500×300 max).
     * Omitted defaults to `stretch`.
     */
    size?: MmImageSize;

    /** Pixel max width (Adaptive Cards `width` when expressed as px). */
    max_width?: number;

    /** Pixel max height (Adaptive Cards `height` when expressed as px). */
    max_height?: number;

    /** Adaptive Cards `style` (`person` = avatar-style crop). */
    image_style?: 'default' | 'person';

    /** Adaptive Cards `horizontalAlignment`. */
    horizontal_alignment?: 'left' | 'center' | 'right';
};

type MmDividerBlock = {
    type: 'divider';
};

type MmColumnBlock = {
    type: 'column';
    items: MmBlock[];
    width?: 'auto' | 'stretch';
};

type MmColumnSetBlock = {
    type: 'column_set';
    columns: MmColumnBlock[];
};

/** Spacing between child blocks inside a container (CSS `gap`). Defaults to `none` when omitted. */
type MmContainerGap = 'none' | 'small' | 'medium' | 'large' | 'xlarge';

type MmContainerBackground = 'none' | 'gray';

/** Preset left accent bar colors (theme-aligned). */
type MmContainerAccentSemantic =
    | 'default'
    | 'primary'
    | 'good'
    | 'warning'
    | 'danger';

type MmContainerBlock = {
    type: 'container';
    content: MmBlock[];

    /** Optional full container border; independent of `accent_color` */
    border?: boolean;

    /**
     * Left bar color: `MmContainerAccentSemantic`, or a CSS color such as `#RRGGBB` / `rgb()` / `var(--…)`.
     * Attachments translator passes the webhook `color` string (often hex or `rgba(var(--link-color-rgb), 0.5)`).
     */
    accent_color?: MmContainerAccentSemantic | string;

    flow?: 'horizontal' | 'vertical';

    /** Space between items in the container flex layout. Defaults to `none`. */
    gap?: MmContainerGap;

    /** Subtle fill when `gray`; omitted or `none` is unchanged. */
    background?: MmContainerBackground;

    /**
     * When set, the container grows with its content up to this maximum height, then scrolls vertically.
     * Preset pixel caps: `small` | `medium` | `large`.
     */
    max_height?: MmContainerMaxHeight;
};

/** Preset maximum heights for `MmContainerBlock.max_height`. */
type MmContainerMaxHeight = 'small' | 'medium' | 'large';

type MmCollapsibleBlock = {
    type: 'collapsible';
    header: MmBlock[];
    content: MmBlock[];
    collapsed?: boolean;
};

type MmBlock =
    | MmTextBlock
    | MmImageBlock
    | MmDividerBlock
    | MmButtonBlock
    | MmStaticSelectBlock
    | MmColumnSetBlock
    | MmColumnBlock
    | MmContainerBlock
    | MmCollapsibleBlock;
