## **Technical Debt**

We'll use this document for now to track down all the implementations that need to be added to each component: 

### Channel Post List 
    
To add the following methods/logic  : 
1. componentDidMount logic 
2. componentDidUpdate logic 
3. componentWillUnmount logic 
4. bottomPaddingAnimation animation
5. goToThread logic 
6. loadMorePostsTop logic / api call 
7. loadPostsRetry logic / api call 
8. render <FailedNetworkAction/> if (postIds.length === 0 && channelRefreshingFailed)
9. render  <RetryBarIndicator/>
10. Testscript 
