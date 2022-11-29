# Start with this installation of node
FROM nginx:latest


# Copy build application
# Files in .dockerignore are not copied here
COPY ./dist /usr/share/nginx/html
COPY .htpasswd_wanne /etc/nginx/.htpasswd_wanne

RUN rm /etc/nginx/conf.d/default.conf && \
    chmod 644 /etc/nginx/.htpasswd_wanne && \
    # Create empty directories, so we can map volumes to them
    mkdir /usr/share/nginx/html/static/images/360deg && \
    mkdir /usr/share/nginx/html/static/videos

# Replace default config
COPY nginx.config /etc/nginx/conf.d/default.conf