FROM node:18-alpine

WORKDIR /app

# Accept MONGO_URI as build argument
ARG MONGO_URI

# Set as environment variable
ENV MONGO_URI=${MONGO_URI}

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
