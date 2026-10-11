# Node 20 matches the version CI lints and builds with (.github/workflows/ci.yml),
# so the image build is byte-comparable to the CI artifact.
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
# Rendered to /etc/nginx/conf.d/default.conf by the image entrypoint, which
# substitutes BACKEND_UPSTREAM from the container environment.
COPY --chown=nginx:nginx nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
