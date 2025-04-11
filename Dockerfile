FROM node:20-alpine

COPY package-lock.json package-lock.json   
COPY package.json package.json

RUN npm install
COPY . .

RUN npm run build

# 10. Expose port 3000
EXPOSE 3000

CMD ["npm", "start"]
