FROM node:24 AS development

WORKDIR /app

COPY package*.json ./

RUN npm install;

COPY . .

ENV PORT=5000
EXPOSE $PORT

CMD ["npm", "run", "dev"]


FROM node:24 AS production

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

ENV PORT=5000
EXPOSE $PORT

CMD ["npm", "start"]

