#import "SessionManager.h"
#import "MattermostBucket.h"

@implementation SessionManager

@synthesize keyChain;

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
    self.keyChain = [[KeyChainDataSource alloc] initWithMode:KSM_Identities];
  }
  return self;
}

-(void)setRequestWithGroup:(NSString *)requestWithGroup certificateName:(NSString *)certificateName {
  self.requestWithGroup = requestWithGroup;
  self.certificateName = certificateName;
  self.isBackground = certificateName == nil;
}

-(void)setDataForRequest:(NSDictionary *)data forRequestWithGroup:(NSString *)requestWithGroup {
  NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
  [[self.bucket bucketByName:appGroupId] setObject:data forKey:requestWithGroup];
}


-(NSString *)getAppGroupIdFromRequestIdentifier:(NSString *) requestWithGroup {
  return [requestWithGroup componentsSeparatedByString:@"|"][1];
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

-(NSDictionary *)getDataForRequest:(NSString *)requestWithGroup {
  NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
  return [[self.bucket bucketByName:appGroupId]  objectForKey:requestWithGroup];
}

-(NSURLSession *)createSessionForRequestRequest:(NSString *)requestWithGroup {
  NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
  NSURLSessionConfiguration* config;
  if (self.isBackground) {
    config = [NSURLSessionConfiguration backgroundSessionConfigurationWithIdentifier:requestWithGroup];
  } else {
    config = [NSURLSessionConfiguration defaultSessionConfiguration];
  }

  config.sharedContainerIdentifier = appGroupId;
  return [NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:nil];
}

-(void) createPost:(NSDictionary *) post
         withFiles:(NSArray *)files
       credentials:(NSDictionary *) credentials
  requestWithGroup:(NSString *)requestWithGroup {
  NSString *serverUrl = [credentials objectForKey:@"url"];
  NSString *token = [credentials objectForKey:@"token"];
  NSString *channelId = [post objectForKey:@"channel_id"];
  NSURLSession *session = [self createSessionForRequestRequest:requestWithGroup];
  NSString *appGroupId = [self getAppGroupIdFromRequestIdentifier:requestWithGroup];
  
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
}

-(void) createPost:(NSMutableDictionary *)post
       withFileIds:(NSArray *)fileIds
       credentials:(NSDictionary *) credentials {
  NSString *serverUrl = [credentials objectForKey:@"url"];
  NSString *token = [credentials objectForKey:@"token"];

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

-(void)createPostForRequest:(NSString *)requestWithGroup {
  NSDictionary *data = [self getDataForRequest:requestWithGroup];
  NSDictionary *post = [data objectForKey:@"post"];
  NSArray *files = [data objectForKey:@"files"];
  NSDictionary *credentials = [self getCredentialsForRequest:requestWithGroup];

  if (credentials == nil) {
    return;
  }
  
  if (files != nil && [files count] > 0) {
    [self createPost:post withFiles:files credentials:credentials requestWithGroup:requestWithGroup];
  }
  else {
    [self createPost:[post mutableCopy] withFileIds:nil credentials:credentials];
  }
}

-(void)sendPostRequestForId:(NSString *)requestWithGroup {
  NSDictionary *data = [self getDataForRequest:requestWithGroup];
  NSDictionary *credentials = [self getCredentialsForRequest:requestWithGroup];
  
  NSMutableDictionary *post = [[data objectForKey:@"post"] mutableCopy];
  NSArray *fileIds = [data objectForKey:@"file_ids"];
  
  [self createPost:post withFileIds:fileIds credentials:credentials];
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


-(void)URLSession:(NSURLSession *)session didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition, NSURLCredential * _Nullable))completionHandler {
  NSLog(@"completition handler from normal challenge");
  if ([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodClientCertificate]) {
    if (self.certificateName) {
      SecIdentityRef identity = [keyChain GetIdentityByName:self.certificateName];
      if (identity != nil) {
        SecCertificateRef certificate = NULL;
        OSStatus status = SecIdentityCopyCertificate(identity, &certificate);
        if (!status) {
          CFArrayRef emailAddresses = NULL;
          SecCertificateCopyEmailAddresses(certificate, &emailAddresses);
          NSArray *emails = (NSArray *)CFBridgingRelease(emailAddresses);
          CFStringRef summaryRef = SecCertificateCopySubjectSummary(certificate);
          NSString *tagstr = (NSString*)CFBridgingRelease(summaryRef);
          NSString *email = @"";
          if ([emails count] > 0){
            email = [emails objectAtIndex:0];
          }
          NSLog(@"completition %@ %@", tagstr, email);
          const void *certs[] = {certificate};
          CFArrayRef certArray = CFArrayCreate(kCFAllocatorDefault, certs, 1, NULL);
          NSURLCredential *credential = [NSURLCredential credentialWithIdentity:identity certificates:(__bridge NSArray*)certArray persistence:NSURLCredentialPersistencePermanent];
          [challenge.sender useCredential:credential forAuthenticationChallenge:challenge];
          completionHandler(NSURLSessionAuthChallengeUseCredential,credential);
          NSLog(@"completition handler for certificate");
          return;
        }
      }
    }
    completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);
    NSLog(@"completition handler that should not be reached");
  } else {
    NSLog(@"completition handler regular stuff");
    completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);
  }
}

-(void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask didReceiveData:(NSData *)data {
  NSString *requestWithGroup;
  if (self.isBackground) {
    requestWithGroup = [[session configuration] identifier];
  } else {
    requestWithGroup = self.requestWithGroup;
  }
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

-(void)URLSession:(NSURLSession *)session task:(NSURLSessionDataTask *)task didCompleteWithError:(nullable NSError *)error {
  NSString *requestWithGroup;
  if (self.isBackground) {
    requestWithGroup = [[session configuration] identifier];
  } else {
    requestWithGroup = self.requestWithGroup;
  }

  if(error != nil) {
    NSLog(@"completition ERROR %@", [error userInfo]);
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
  } else {
    NSLog(@"SOMETHING ELSE");
  }
}

-(void)URLSessionDidFinishEventsForBackgroundURLSession:(NSURLSession *)session {
  if (self.savedCompletionHandler) {
    self.savedCompletionHandler();
    self.savedCompletionHandler = nil;
  }
}

@end
