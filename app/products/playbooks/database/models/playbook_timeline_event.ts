// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

const {PLAYBOOK_RUN, PLAYBOOK_TIMELINE_EVENT} = PLAYBOOK_TABLES;

export default class PlaybookTimelineEventModel extends Model {
    static table = PLAYBOOK_TIMELINE_EVENT;

    static associations: Associations = {
        [PLAYBOOK_RUN]: {type: 'belongs_to', key: 'run_id'},
    };

    @field('run_id') runId!: string;
    @field('event_at') eventAt!: number;
    @field('event_type') eventType!: string;
    @field('details') details!: string;
    @field('subject_user_id') subjectUserId!: string;
    @field('create_at') createAt!: number;
    @field('summary') summary!: string;
    @field('post_id') postId!: string;
    @field('creator_user_id') creatorUserId!: string;

    @immutableRelation(PLAYBOOK_RUN, 'run_id') run!: Relation<PlaybookRunModel>;

    toTimelineEvent(): TimelineEvent {
        return {
            id: this.id,
            playbook_run_id: this.runId,
            event_at: this.eventAt,
            event_type: this.eventType,
            details: this.details,
            subject_user_id: this.subjectUserId,
            create_at: this.createAt,
            summary: this.summary,
            post_id: this.postId,
            creator_user_id: this.creatorUserId,
        };
    }
}
