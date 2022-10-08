# Start with this installation of node
FROM nginx:latest

# Replace default config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.config /etc/nginx/conf.d/default.conf

# Copy build application
COPY ./dist /usr/share/nginx/html