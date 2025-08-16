FROM node:18 as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Modify the build command to ensure we get a browser-compatible output
RUN npm run build -- --configuration production

FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy the browser-specific build output
COPY --from=build /app/dist/mapa-front/browser /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Ensure the default.conf is the only config used
RUN rm -f /etc/nginx/conf.d/default.conf.default

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]