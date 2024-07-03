// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {z} from 'zod';

export const JetConfigSchema = z.
    object({
        port: z.number().optional(),
        timeout: z.number().optional(),
        slow: z.number().optional(),
        metroPort: z.number().optional(),
        reporter: z.string().optional(),
        hostname: z.string().optional(),
        grep: z.string().optional(),
        context: z.record(z.string()).optional(),
        reporterOptions: z.record(z.string()).optional(),
        watch: z.boolean().optional().optional(),
        invert: z.boolean().optional().optional(),
        coverage: z.boolean().optional().optional(),
        exitOnError: z.boolean().optional().optional(),
    }).
    optional();

export type JetConfig = z.infer<typeof JetConfigSchema>;
