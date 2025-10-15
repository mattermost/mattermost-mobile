// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookRunAttributeModelInterface from '@playbooks/types/database/models/playbook_run_attribute';

const {PLAYBOOK_RUN_ATTRIBUTE, PLAYBOOK_RUN_ATTRIBUTE_VALUE} = PLAYBOOK_TABLES;

/**
 * The model represents a playbook run attribute definition in the Mattermost app.
 */
export default class PlaybookRunAttributeModel extends Model implements PlaybookRunAttributeModelInterface {
    /** table (name) : PlaybookRunAttribute */
    static table = PLAYBOOK_RUN_ATTRIBUTE;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {
        [PLAYBOOK_RUN_ATTRIBUTE_VALUE]: {type: 'has_many', foreignKey: 'attribute_id'},
    };

    /** groupId : The group ID of the attribute */
    @field('group_id') groupId!: string;

    /** name : The name of the attribute */
    @field('name') name!: string;

    /** type : The type of the attribute */
    @field('type') type!: string;

    /** targetId : The target ID of the attribute */
    @field('target_id') targetId!: string;

    /** targetType : The target type of the attribute */
    @field('target_type') targetType!: string;

    /** createAt : The timestamp of when the attribute was created */
    @field('create_at') createAt!: number;

    /** updateAt : The timestamp of when the attribute was last updated */
    @field('update_at') updateAt!: number;

    /** deleteAt : The timestamp of when the attribute was deleted */
    @field('delete_at') deleteAt!: number;

    /** attrs : Additional attributes for the attribute (JSON string) */
    @field('attrs') attrs?: string;
}
