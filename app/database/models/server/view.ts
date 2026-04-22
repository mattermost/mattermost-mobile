// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type ViewModelInterface from '@typings/database/models/servers/view';

const {VIEW} = MM_TABLES.SERVER;

/**
 * The View model represents the 'BoardView' table and describes the per-channel
 * kanban presentation of a board. One channel can have multiple views.
 */
export default class ViewModel extends Model implements ViewModelInterface {
    /** table (name) : BoardView */
    static table = VIEW;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {};

    /** channel_id : The channel this view belongs to */
    @field('channel_id') channelId!: string;

    /** type : The view type (e.g. 'kanban') */
    @field('type') type!: ViewType;

    /** creator_id : The user that created this view */
    @field('creator_id') creatorId!: string;

    /** title : The view title */
    @field('title') title!: string;

    /** description : Optional view description */
    @field('description') description!: string | null;

    /** sort_order : The ordering position of this view within the channel */
    @field('sort_order') sortOrder!: number;

    /** props : Free-form view props */
    @json('props', safeParseJSON) props!: Record<string, unknown> | null;

    /** create_at : The timestamp when this view was created */
    @field('create_at') createAt!: number;

    /** update_at : The timestamp when this view was last updated */
    @field('update_at') updateAt!: number;

    /** delete_at : The timestamp when this view was deleted (0 if not deleted) */
    @field('delete_at') deleteAt!: number;
}
