//
//  PerformRequests.h
//  MattermostShare
//
//  Created by Elias Nahum on 12/18/17.
//  Copyright © 2017 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface PerformRequests : NSObject<NSURLSessionDelegate, NSURLSessionTaskDelegate>
@property (nonatomic, strong) NSString *appGroupId;
@property (nonatomic, strong) NSString *requestId;
@property (nonatomic, strong) NSMutableArray *fileIds;
@property (nonatomic, strong) NSArray *files;
@property (nonatomic, strong) NSDictionary *post;

@property (nonatomic, strong) NSString *serverUrl;
@property (nonatomic, strong) NSString *token;
@property NSUserDefaults *bucket;

- (id) initWithPost:(NSDictionary *) post
          withFiles:(NSArray *) files
       forRequestId:(NSString *)requestId
       inAppGroupId:(NSString *) appGroupId;

-(void)createPost;
@end
