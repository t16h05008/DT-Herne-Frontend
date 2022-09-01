# Digital Twin Herne Frontend <!-- omit in toc -->

**Table of Content**
- [Overview](#overview)
- [Dependencies](#dependencies)
- [Installation](#installation)
  - [Building from source](#building-from-source)
  - [Docker](#docker)
- [Next Steps](#next-steps)
- [Development Information](#development-information)
  - [Contact](#contact)
  - [License](#license)

## Overview
This repository contains the frontend component of the [Digital Twin Herne Project](https://github.com/t16h05008/DT-Herne).

## Dependencies
This component depends on the [backend component](https://github.com/t16h05008/DT-Herne-Backend) to function properly. It is recommended to setup that component first.

## Installation
This section describes how to install the application in an production environment. For development see [Development Information](#development-information) below.

### Building from source
1. Clone the repository to your local system.
2. The application includes some of the standard Cesium ion maps and terrain. These are only accessible with an API-token, that can be generated for free with an [Cesium ion account](https://cesium.com/ion/signup/). Insert that token in the file env.js.
3. The env.js file also contains the path to the backend component. By default it is set to `http://localhost:8000/`. If the backend runs on a different server or port, this has to be adjusted accordingly.
4. From the project's root directory run the command `npm install`.
    This uses the [Node Package Manger](https://www.npmjs.com/) to install the dependencies.
5. Next run the command `npm build`. This uses Webpack to build the application for production. The output is served to the subdirectory `dist`.
6. The application is available on port 8080 by default. Copy the contents of the `dist` folder to your preferred webserver to deploy.

### Docker
TODO

## Next Steps
TODO


## Development Information
TODO

- cesium api key

### Contact
See the section [Contributing Organizations and Contact](https://github.com/t16h05008/DT-Herne#contributing-organizations-and-contact) in the project's main repository.

### License
See the section [License](https://github.com/t16h05008/DT-Herne#license) in the project's main repository.