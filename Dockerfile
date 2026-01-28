# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# deps reproducibles
COPY package*.json ./
RUN npm ci

# code
COPY . .

# build (tsc -b && vite build)
RUN npm run build


# ---- Runtime stage ----
FROM nginx:1.27-alpine

# limpia default
RUN rm -rf /usr/share/nginx/html/*

# copia dist/
COPY --from=build /app/dist /usr/share/nginx/html

# config nginx para SPA + cache
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
