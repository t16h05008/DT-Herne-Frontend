# Start with this installation of node
FROM node:16.13.2

# Create a new directory for app files and set the path in the container
RUN mkdir -p /app

# Setting working directory in the container
WORKDIR /app

# Copy the package.json file from project source dir to container dir
COPY ["package.json", "package-lock.json", "./"]

# Copy the source code into the container dir ("." means current directory)
COPY . .

# Install the dependencies into the container
RUN npm install

# Server will run under this port in the container
EXPOSE 8080

# Command to run within the container
CMD ["npm", "start"]