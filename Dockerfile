FROM node:18 as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy build files from the Angular app
# Note: The path might need adjustment based on your Angular output structure
COPY --from=build /app/dist/mapa-front/browser /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# For debugging - list the contents of the html directory
RUN ls -la /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]