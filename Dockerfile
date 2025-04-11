FROM node:20-alpine

COPY package-lock.json package-lock.json   
COPY package.json package.json

RUN npm install
COPY . .

RUN npm run build
