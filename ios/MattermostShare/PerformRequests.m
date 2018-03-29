#import "PerformRequests.h"
#import "MattermostBucket.h"
#import "SessionManager.h"

@implementation PerformRequests

- (id) initWithPost:(NSDictionary *) post
          withFiles:(NSArray *) files
       forRequestId:(NSString *)requestId
       inAppGroupId:(NSString *) appGroupId
          inContext:(NSExtensionContext *) context {
  self = [super init];
  if (self) {
    self.post = post;
    self.files = files;
    self.appGroupId = appGroupId;
    self.requestId = requestId;
    self.extensionContext = context;

    self.bucket = [[MattermostBucket alloc] init];
    [self setCredentials];
  }
  return self;
}

-(void)setCredentials {
  NSString *entitiesString = [self.bucket readFromFile:@"entities" appGroupId:self.appGroupId];
  NSData *entitiesData = [entitiesString dataUsingEncoding:NSUTF8StringEncoding];
  NSDictionary *entities = [NSJSONSerialization JSONObjectWithData:entitiesData options:NSJSONReadingMutableContainers error:nil];
  NSDictionary *credentials = [[entities objectForKey:@"general"] objectForKey:@"credentials"];
  self.serverUrl = [credentials objectForKey:@"url"];
  self.token = [credentials objectForKey:@"token"];
}

-(void)URLSession:(NSURLSession *)session task:(NSURLSessionDataTask *)task didCompleteWithError:(nullable NSError *)error {
  if(error != nil) {
    NSLog(@"ERROR %@", [error userInfo]);
    [self.extensionContext completeRequestReturningItems:nil
                                       completionHandler:nil];
    NSLog(@"invalidating session %@", self.requestId);
    [session finishTasksAndInvalidate];
  }
}

-(void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask didReceiveData:(NSData *)data {
  NSString *sessionRequestId = [[session configuration] identifier];
  
  if ([sessionRequestId containsString:@"files"]) {
    NSLog(@"Got file response");
    NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    if (json != nil) {
      NSArray *fileInfos = [json objectForKey:@"file_infos"];
      self.fileIds = [[NSMutableArray alloc] init];
      for (id file in fileInfos) {
        [self.fileIds addObject:[file objectForKey:@"id"]];
      }
      NSLog(@"Calling sendPostRequest");
      [self sendPostRequest];
    }
    
    NSLog(@"Cleaning temp files");
    [self cleanUpTempFiles];
  }
}

-(void)createPost {
  NSString *channelId = [self.post objectForKey:@"channel_id"];
  
  NSURL *filesUrl = [NSURL URLWithString:[self.serverUrl stringByAppendingString:@"/api/v4/files"]];
  
  if (self.files != nil && [self.files count] > 0) {
    NSString *POST_BODY_BOUNDARY = @"mobile.client.file.upload";
    NSURLSessionConfiguration* config = [NSURLSessionConfiguration backgroundSessionConfigurationWithIdentifier:[self.requestId stringByAppendingString:@"-files"]];
    config.sharedContainerIdentifier = self.appGroupId;
    
    NSMutableURLRequest *uploadRequest = [NSMutableURLRequest requestWithURL:filesUrl cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:120.0];
    [uploadRequest setHTTPMethod:@"POST"];
    [uploadRequest setValue:[@"Bearer " stringByAppendingString:self.token] forHTTPHeaderField:@"Authorization"];
    [uploadRequest setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    
    NSString *contentTypeValue = [NSString stringWithFormat:@"multipart/form-data;boundary=%@", POST_BODY_BOUNDARY];
    [uploadRequest addValue:contentTypeValue forHTTPHeaderField:@"Content-Type"];
    
    NSMutableData *dataForm = [NSMutableData alloc];
    [dataForm appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n", POST_BODY_BOUNDARY] dataUsingEncoding:NSUTF8StringEncoding]];
    [dataForm appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"channel_id\";\r\n\r\n%@", channelId] dataUsingEncoding:NSUTF8StringEncoding]];
    
    for (id file in self.files) {
      NSData *fileData = [NSData dataWithContentsOfFile:[file objectForKey:@"filePath"]];
      NSString *mimeType = [file objectForKey:@"mimeType"];
      NSLog(@"MimeType %@", mimeType);
      [dataForm appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n", POST_BODY_BOUNDARY] dataUsingEncoding:NSUTF8StringEncoding]];
      [dataForm appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"files\"; filename=\"%@\"\r\n",
                             [file objectForKey:@"filename"]] dataUsingEncoding:NSUTF8StringEncoding]];
      [dataForm appendData:[[NSString stringWithFormat:@"Content-Type: %@\r\n\r\n", mimeType] dataUsingEncoding:NSUTF8StringEncoding]];
      [dataForm appendData:[NSData dataWithData:fileData]];
    }
    
    [dataForm appendData:[[NSString stringWithFormat:@"\r\n--%@--\r\n", POST_BODY_BOUNDARY] dataUsingEncoding:NSUTF8StringEncoding]];
    [uploadRequest setHTTPBody:dataForm];
    NSURLSession *uploadSession = [NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:[NSOperationQueue mainQueue]];
    NSURLSessionDataTask *uploadTask = [uploadSession dataTaskWithRequest:uploadRequest];
    NSLog(@"Executing file request");
    [uploadTask resume];
  } else {
    [self sendPostRequest];
  }
}

-(void)sendPostRequest {
  NSMutableDictionary *post = [self.post mutableCopy];
  [post setValue:self.fileIds forKey:@"file_ids"];
  NSData *postData = [NSJSONSerialization dataWithJSONObject:post options:NSJSONWritingPrettyPrinted error:nil];
  NSString* postAsString = [[NSString alloc] initWithData:postData encoding:NSUTF8StringEncoding];
  
  NSURL *createUrl = [NSURL URLWithString:[self.serverUrl stringByAppendingString:@"/api/v4/posts"]];
  
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:createUrl cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:5.0];
  [request setHTTPMethod:@"POST"];
  [request setValue:[@"Bearer " stringByAppendingString:self.token] forHTTPHeaderField:@"Authorization"];
  [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
  [request setValue:@"application/json; charset=utf-8" forHTTPHeaderField:@"Content-Type"];
  [request setHTTPBody:[postAsString dataUsingEncoding:NSUTF8StringEncoding]];
  
  NSURLSessionConfiguration* config = [NSURLSessionConfiguration ephemeralSessionConfiguration];
  NSURLSession *createSession = [NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:nil];
  NSURLSessionDataTask *createTask = [createSession dataTaskWithRequest:request];
  NSLog(@"Executing post request");
  [createTask resume];
  [self.extensionContext completeRequestReturningItems:nil
                                     completionHandler:nil];
  NSLog(@"Extension closed");
}

- (void) cleanUpTempFiles {
  NSURL *tmpDirectoryURL = [[SessionManager sharedSession] tempContainerURL:self.appGroupId];
  if (tmpDirectoryURL == nil) {
    return;
  }
  
  NSFileManager *fileManager = [NSFileManager defaultManager];
  NSError *error;
  NSArray *tmpFiles = [fileManager contentsOfDirectoryAtPath:[tmpDirectoryURL path] error:&error];
  if (error) {
    return;
  }
  
  for (NSString *file in tmpFiles)
  {
    error = nil;
    [fileManager removeItemAtPath:[[tmpDirectoryURL URLByAppendingPathComponent:file] path] error:&error];
  }
}
@end
