#import "SessionManager.h"
#import "MattermostBucket.h"

@implementation SessionManager
+ (instancetype)sharedSession {
  static id sharedMyManager = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedMyManager = [[self alloc] init];
  });
  return sharedMyManager;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    self.bucket = [[MattermostBucket alloc] init];
  }
  return self;
}

-(NSString *)getAppGroupIdFromRequestIdentifier:(NSString *) requestWithGroup {
  return [requestWithGroup componentsSeparatedByString:@"|"][1];
}

-(void)URLSessionDidFinishEventsForBackgroundURLSession:(NSURLSession *)session {
  if (self.savedCompletionHandler) {
    self.savedCompletionHandler();
    self.savedCompletionHandler = nil;
  }
}

-(void)URLSession:(NSURLSession *)session task:(NSURLSessionDataTask *)task didCompleteWithError:(nullable NSError *)error {
  NSString *requestWithGroup = [[session configuration] identifier];

  if(error != nil) {
    NSLog(@"ERROR %@", [error userInfo]);
    NSLog(@"invalidating session %@", requestWithGroup);
    [session invalidateAndCancel];
  } else if (requestWithGroup != nil) {
    NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
    NSURL *requestUrl = [[task originalRequest] URL];
    
    NSDictionary *data = [self getDataForRequest:requestWithGroup];
    NSArray *files = [data objectForKey:@"files"];
    NSMutableArray *fileIds = [data objectForKey:@"file_ids"];
    
    if ([[requestUrl absoluteString] containsString:@"files"] &&
        [files count] == [fileIds count]) {
      [self sendPostRequestForId:requestWithGroup];
      [[self.bucket bucketByName:appGroupId] removeObjectForKey:requestWithGroup];
    }
  }
}

-(void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask didReceiveData:(NSData *)data {
  NSString *requestWithGroup = [[session configuration] identifier];
  NSURL *requestUrl = [[dataTask originalRequest] URL];
  
  if ([[requestUrl absoluteString] containsString:@"files"]) {
    NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
    NSError *error;
    NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    if (error == nil && json != nil) {
      NSArray *fileInfos = [json objectForKey:@"file_infos"];
      NSDictionary *dataFromBucket = [self getDataForRequest:requestWithGroup];
      NSMutableDictionary *data = [dataFromBucket mutableCopy];
      NSMutableArray *fileIds = [[data objectForKey:@"file_ids"] mutableCopy];
      if (fileIds == nil && data != nil) {
        fileIds = [[NSMutableArray alloc] init];
      }
      
      for (id file in fileInfos) {
        [fileIds addObject:[file objectForKey:@"id"]];
        NSString * filename = [file objectForKey:@"name"];
        NSLog(@"got file id %@ %@", [file objectForKey:@"id"], filename);
        NSURL *tempContainerURL = [self tempContainerURL:appGroupId];
        NSURL *destinationURL = [tempContainerURL URLByAppendingPathComponent: filename];
        [[NSFileManager defaultManager] removeItemAtURL:destinationURL error:nil];
      }
      [data setObject:fileIds forKey:@"file_ids"];
      [self setDataForRequest:data forRequestWithGroup:requestWithGroup];
    }
  }
}

-(void)setDataForRequest:(NSDictionary *)data forRequestWithGroup:(NSString *)requestWithGroup {
  NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
  [[self.bucket bucketByName:appGroupId] setObject:data forKey:requestWithGroup];
}

-(NSDictionary *)getDataForRequest:(NSString *)requestWithGroup {
  NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
  return [[self.bucket bucketByName:appGroupId]  objectForKey:requestWithGroup];
}

-(NSURLSession *)createSessionForRequestRequest:(NSString *)requestWithGroup {
  NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
  NSURLSessionConfiguration* config = [NSURLSessionConfiguration backgroundSessionConfigurationWithIdentifier:requestWithGroup];
  config.sharedContainerIdentifier = appGroupId;
  return [NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:nil];
}

-(NSDictionary *)getCredentialsForRequest:(NSString *)requestWithGroup {
  NSString * appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
  NSString *entitiesString = [self.bucket readFromFile:@"entities" appGroupId:appGroupId];
  NSData *entitiesData = [entitiesString dataUsingEncoding:NSUTF8StringEncoding];
  NSError *error;
  NSDictionary *entities = [NSJSONSerialization JSONObjectWithData:entitiesData options:NSJSONReadingMutableContainers error:&error];
  if (error != nil) {
    return nil;
  }
  return [[entities objectForKey:@"general"] objectForKey:@"credentials"];
}

-(void)createPostForRequest:(NSString *)requestWithGroup {
  NSDictionary *data = [self getDataForRequest:requestWithGroup];
  NSDictionary *post = [data objectForKey:@"post"];
  NSArray *files = [data objectForKey:@"files"];
  
  if (files != nil && [files count] > 0) {
    NSString *channelId = [post objectForKey:@"channel_id"];
    NSDictionary *credentials = [self getCredentialsForRequest:requestWithGroup];
    NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
    
    if (credentials == nil) {
      return;
    }
    
    NSString *serverUrl = [credentials objectForKey:@"url"];
    NSString *token = [credentials objectForKey:@"token"];
    NSURLSession *session = [self createSessionForRequestRequest:requestWithGroup];

    for (id file in files) {
      NSURL *filePath = [NSURL fileURLWithPath:[file objectForKey:@"filePath"]];
      NSString *fileName = [file objectForKey:@"filename"];
      
      NSError *err;
      NSURL *tempContainerURL = [self tempContainerURL:appGroupId];
      NSURL *destinationURL = [tempContainerURL URLByAppendingPathComponent: fileName];
      BOOL bVal = [[NSFileManager defaultManager] copyItemAtURL:filePath toURL:destinationURL error:&err];
      
      NSCharacterSet *allowedCharacters = [NSCharacterSet URLQueryAllowedCharacterSet];
      NSString *encodedFilename = [[file objectForKey:@"filename"] stringByAddingPercentEncodingWithAllowedCharacters:allowedCharacters];
      NSString *url = [serverUrl stringByAppendingString:@"/api/v4/files"];
      NSString *queryString = [NSString stringWithFormat:@"?channel_id=%@&filename=%@", channelId, encodedFilename];
      NSURL *filesUrl = [NSURL URLWithString:[url stringByAppendingString:queryString]];
      NSMutableURLRequest *uploadRequest = [NSMutableURLRequest requestWithURL:filesUrl cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:120.0];
      [uploadRequest setHTTPMethod:@"POST"];
      [uploadRequest setValue:[@"Bearer " stringByAppendingString:token] forHTTPHeaderField:@"Authorization"];
      [uploadRequest setValue:@"application/json" forHTTPHeaderField:@"Accept"];
      
      NSURLSessionUploadTask *task = [session uploadTaskWithRequest:uploadRequest fromFile:destinationURL];
      NSLog(@"Executing file request %@", fileName);
      [task resume];
    }
  } else {
    [self sendPostRequestForId:requestWithGroup];
  }
}

-(void)sendPostRequestForId:(NSString *)requestWithGroup {
  NSDictionary *data = [self getDataForRequest:requestWithGroup];
  NSDictionary *credentials = [self getCredentialsForRequest:requestWithGroup];
  
  if (credentials == nil) {
    return;
  }
  
  NSString *serverUrl = [credentials objectForKey:@"url"];
  NSString *token = [credentials objectForKey:@"token"];
  NSMutableDictionary *post = [[data objectForKey:@"post"] mutableCopy];
  NSArray *fileIds = [data objectForKey:@"file_ids"];

  if (fileIds != nil && [fileIds count] > 0) {
    [post setObject:fileIds forKey:@"file_ids"];
  }

  NSError *error;
  NSData *postData = [NSJSONSerialization dataWithJSONObject:post options:NSJSONWritingPrettyPrinted error:&error];
  
  if (error == nil) {
    NSString* postAsString = [[NSString alloc] initWithData:postData encoding:NSUTF8StringEncoding];
    
    NSURL *createUrl = [NSURL URLWithString:[serverUrl stringByAppendingString:@"/api/v4/posts"]];
    
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:createUrl cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:5.0];
    [request setHTTPMethod:@"POST"];
    [request setValue:[@"Bearer " stringByAppendingString:token] forHTTPHeaderField:@"Authorization"];
    [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    [request setValue:@"application/json; charset=utf-8" forHTTPHeaderField:@"Content-Type"];
    [request setHTTPBody:[postAsString dataUsingEncoding:NSUTF8StringEncoding]];
    
    NSURLSessionConfiguration* config = [NSURLSessionConfiguration ephemeralSessionConfiguration];
    NSURLSession *createSession = [NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:nil];
    NSURLSessionDataTask *createTask = [createSession dataTaskWithRequest:request];
    NSLog(@"Executing post request");
    [createTask resume];
  }
}

-(NSURL*)tempContainerURL:(NSString*)appGroupId {
  NSFileManager *manager = [NSFileManager defaultManager];
  NSURL *containerURL = [manager containerURLForSecurityApplicationGroupIdentifier:appGroupId];
  NSURL *tempDirectoryURL = [containerURL URLByAppendingPathComponent:@"shareTempItems"];
  if (![manager fileExistsAtPath:[tempDirectoryURL path]]) {
    NSError *err;
    [manager createDirectoryAtURL:tempDirectoryURL withIntermediateDirectories:YES attributes:nil error:&err];
    if (err) {
      return nil;
    }
  }
  
  return tempDirectoryURL;
}


@end
