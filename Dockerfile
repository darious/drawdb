# Stage 1: Build the app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Optionally trust a corporate proxy CA (e.g. Zscaler) during install.
# Pass with: docker build --secret id=node_ca,src=./zscaler-root.pem ...
# Harmless when the secret is not provided.
RUN --mount=type=secret,id=node_ca \
    if [ -f /run/secrets/node_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/node_ca; fi; \
    npm ci
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Stage 2: Setup the Nginx Server to serve the app
FROM docker.io/library/nginx:stable-alpine3.23 AS production
COPY --from=build /app/dist /usr/share/nginx/html
RUN echo 'server { listen 80; server_name _; root /usr/share/nginx/html;  location / { try_files $uri /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
