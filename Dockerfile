FROM node:18 as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
# List the build output to see the structure
RUN ls -la dist/mapa-front

FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy the Angular build files directly
COPY --from=build /app/dist/mapa-front /usr/share/nginx/html

# Copy custom nginx config - replace the default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Also replace the main nginx.conf to ensure our config is used
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]