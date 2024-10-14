from mitmproxy.net.http.http1.assemble import assemble_request, assemble_response
from datetime import datetime
import math
from urllib.parse import urlsplit

# Use a context manager to handle file operations
f = open('./flow-output.csv', 'w')
  
def response(flow):
    # Convert timestamps to milliseconds
    req_ts = math.floor(flow.request.timestamp_start * 1000)
    req_te = math.floor(flow.request.timestamp_end * 1000)
    resp_ts = math.floor(flow.response.timestamp_start * 1000)
    resp_te = math.floor(flow.response.timestamp_end * 1000)

    # Calculate total times
    request_total_time = req_te - req_ts
    response_total_time = resp_te - resp_ts
    total_time = resp_te - req_ts

    # Convert timestamps to human-readable dates
    req_ts_human = datetime.fromtimestamp(req_ts / 1000).strftime('%Y-%m-%d %H:%M:%S.%f')
    req_te_human = datetime.fromtimestamp(req_te / 1000).strftime('%Y-%m-%d %H:%M:%S.%f')
    resp_ts_human = datetime.fromtimestamp(resp_ts / 1000).strftime('%Y-%m-%d %H:%M:%S.%f')
    resp_te_human = datetime.fromtimestamp(resp_te / 1000).strftime('%Y-%m-%d %H:%M:%S.%f')

    # Parse the URL to separate path and query string
    url_parts = urlsplit(flow.request.path)
    path = url_parts.path
    query = url_parts.query

    # Format data as a comma-separated string
    data = (
        f"{req_ts_human},"
        f"{req_te_human},"
        f"{request_total_time},"
        f"{flow.request.method},"
        f"{flow.request.host},"
        f"{path},"
        f"{query},"
        f"{flow.response.status_code},"
        f"{resp_ts_human},"
        f"{resp_te_human},"
        f"{response_total_time},"
        f"{total_time}\n"
    )

    # need to figure out how to get the content-length header
    # f"{flow.response.headers['Content-Length']}\n"

    # Write the formatted string to the file
    f.write(data)
