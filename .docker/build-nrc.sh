#!/bin/bash
docker build --build-arg GITHUB_TOKEN=$1  -t node:nrc  .