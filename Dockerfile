# Start with this installation of node
FROM nginx:latest

# Replace default config

COPY .htpasswd_wanne /etc/nginx/.htpasswd_wanne
RUN rm /etc/nginx/conf.d/default.conf && chmod 644 /etc/nginx/.htpasswd_wanne
COPY nginx.config /etc/nginx/conf.d/default.conf

# Copy build application
COPY ./dist /usr/share/nginx/html