# build.sh
#!/bin/bash

# Build the dist folder, then use it to build the image and push it to DockerHub
npx webpack --config webpack.config.prod.js && \
docker image build --tag t16h05008/dt-herne-wanne-frontend . && \
docker push t16h05008/dt-herne-wanne-frontend