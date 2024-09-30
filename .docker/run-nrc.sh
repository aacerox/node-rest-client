#!/bin/bash
docker run --name nrc-dev-container --rm -v $(pwd)/..:/opt/node-rest-client -it node:nrc /bin/sh