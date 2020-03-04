package com.mattermost.rnbeta;

import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.HttpHeaders;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.ByteArrayContent;
import com.google.api.client.http.HttpBackOffUnsuccessfulResponseHandler;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.GenericJson;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.ExponentialBackOff;

import java.io.IOException;

public class HttpClient {
    private HttpRequestFactory mRequestFactory;

    static HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    static JsonFactory JSON_FACTORY = new JacksonFactory();

    public HttpClient() {
        this(false);
    }

    public HttpClient(Boolean withExponentialBackoff) {
        mRequestFactory = HTTP_TRANSPORT.createRequestFactory(
            (HttpRequest request) -> {
              request.setParser(new JsonObjectParser(JSON_FACTORY));

              HttpHeaders headers = request.getHeaders();
              headers.setContentType("application/json");
              request.setHeaders(headers);

              if (withExponentialBackoff) {
                  ExponentialBackOff backoff = buildExponentialBackoff();
                  request.setUnsuccessfulResponseHandler(
                      new HttpBackOffUnsuccessfulResponseHandler(backoff));
              }
          }
        );
    }

    protected ExponentialBackOff buildExponentialBackoff() {
        return new ExponentialBackOff.Builder()
            .setInitialIntervalMillis(500)
            .setMaxElapsedTimeMillis(900000)
            .setMaxIntervalMillis(6000)
            .setMultiplier(1.5)
            .setRandomizationFactor(0.5)
            .build();
    }

    protected HttpResponse post(String url, String authorization, String bodyString) throws IOException {
        ByteArrayContent body = ByteArrayContent.fromString("application/json", bodyString);
        HttpRequest request = mRequestFactory.buildPostRequest(
            new GenericUrl(url), body);

        HttpHeaders headers = request.getHeaders();
        headers.setAuthorization(authorization);
        request.setHeaders(headers);

        return request.execute();
    }
}