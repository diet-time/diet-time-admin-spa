FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_SAME_ORIGIN=true
RUN npm run build && node scripts/render-nginx-config.mjs

FROM nginx:1.27-alpine
RUN apk add --no-cache ca-certificates
COPY --from=build /app/nginx.generated.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'ok\n' > /usr/share/nginx/html/health
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/health || exit 1
