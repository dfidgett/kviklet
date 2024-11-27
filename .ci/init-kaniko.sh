#!/usr/bin/env bash

set -e

mkdir -p /kaniko/.docker
echo "{
  \"credHelpers\": {
    \"${AWS_ECR_REPOSITORY}\":\"ecr-login\"
  }
}" > /kaniko/.docker/config.json
cat /kaniko/.docker/config.json
